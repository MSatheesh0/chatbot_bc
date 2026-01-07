const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

// 1. Create Payment Intent
router.post('/create-intent', auth, async (req, res) => {
    try {
        const { amount, metadata } = req.body; // amount in INR (rupees)

        console.log(`Creating Payment Intent for ₹${amount} by user ${req.user.id}`);

        // Convert to paise (minimum unit for INR)
        const amountInPaise = Math.round(amount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInPaise,
            currency: 'inr',
            description: 'Consultation Fee', // Required for some Indian regulations
            metadata: {
                userId: req.user.id,
                ...metadata
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        console.log('Payment Intent Created:', paymentIntent.id);

        // Save initial payment record
        const payment = new Payment({
            paymentIntentId: paymentIntent.id,
            amount: amountInPaise,
            status: 'pending',
            userId: req.user.id,
            metadata: metadata
        });
        await payment.save();

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (err) {
        console.error('Error creating payment intent:', err);
        res.status(500).json({ message: err.message });
    }
});

// 2. Verify Payment
router.post('/verify', auth, async (req, res) => {
    try {
        const { paymentIntentId } = req.body;

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        let status = 'pending';
        if (paymentIntent.status === 'succeeded') {
            status = 'succeeded';
        } else if (paymentIntent.status === 'requires_payment_method') {
            status = 'failed';
        }

        // Update DB
        const payment = await Payment.findOneAndUpdate(
            { paymentIntentId: paymentIntentId },
            { status: status },
            { new: true }
        );

        let appointment = null;

        // Atomic Appointment Creation
        if (status === 'succeeded') {
            const Appointment = require('../models/Appointment');

            // Check if appointment already exists
            appointment = await Appointment.findOne({ paymentId: paymentIntentId });

            if (!appointment) {
                console.log('Creating appointment for successful payment:', paymentIntentId);

                const metadata = paymentIntent.metadata;
                const amountInRupees = paymentIntent.amount / 100;

                // Generate QR Data
                const appointmentDate = metadata.appointmentDate || new Date().toISOString();

                const qrDataObj = {
                    appointmentId: 'PENDING', // Will update after save
                    doctorName: metadata.doctorName,
                    hospitalName: metadata.hospitalName,
                    amount: amountInRupees,
                    date: appointmentDate,
                    paymentId: paymentIntentId,
                    status: 'confirmed'
                };

                appointment = new Appointment({
                    userId: req.user.id,
                    doctorId: metadata.doctorId,
                    doctorName: metadata.doctorName,
                    hospitalName: metadata.hospitalName,
                    amount: amountInRupees,
                    date: appointmentDate,
                    paymentId: paymentIntentId,
                    status: 'confirmed',
                    qrCodeData: JSON.stringify(qrDataObj)
                });

                await appointment.save();

                // Update QR data with actual ID
                qrDataObj.appointmentId = appointment._id;
                appointment.qrCodeData = JSON.stringify(qrDataObj);
                await appointment.save();

                console.log('Appointment created:', appointment._id);

                // --- CREATE NOTIFICATIONS ---
                try {
                    const Notification = require('../models/Notification');
                    const apptDate = new Date(appointmentDate);

                    // 24 Hours Before
                    const time24h = new Date(apptDate.getTime() - 24 * 60 * 60 * 1000);
                    if (time24h > new Date()) {
                        await new Notification({
                            userId: req.user.id,
                            appointmentId: appointment._id,
                            doctorName: metadata.doctorName,
                            reminderType: '24h',
                            scheduledTime: time24h
                        }).save();
                        console.log('Scheduled 24h notification');
                    }

                    // 2 Hours Before
                    const time2h = new Date(apptDate.getTime() - 2 * 60 * 60 * 1000);
                    if (time2h > new Date()) {
                        await new Notification({
                            userId: req.user.id,
                            appointmentId: appointment._id,
                            doctorName: metadata.doctorName,
                            reminderType: '2h',
                            scheduledTime: time2h
                        }).save();
                        console.log('Scheduled 2h notification');
                    }
                } catch (notifErr) {
                    console.error('Error creating notifications:', notifErr);
                    // Don't fail the request if notification creation fails
                }
            }
        }

        res.json({ status: status, payment: payment, appointment: appointment });
    } catch (err) {
        console.error('Error verifying payment:', err);
        res.status(500).json({ message: err.message });
    }
});

// 3. Refund Payment (with cancellation logic)
router.post('/refund', auth, async (req, res) => {
    try {
        const { paymentIntentId } = req.body;
        const CANCELLATION_FEE = 5000; // ₹50 in paise

        const payment = await Payment.findOne({ paymentIntentId });
        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        if (payment.status !== 'succeeded') {
            return res.status(400).json({ message: 'Payment not successful, cannot refund' });
        }

        // Calculate refund amount (Total - Fee)
        const refundAmount = Math.max(0, payment.amount - CANCELLATION_FEE);

        if (refundAmount === 0) {
            return res.status(400).json({ message: 'Refund amount is zero after cancellation fee' });
        }

        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: refundAmount,
            metadata: {
                reason: 'user_cancellation'
            }
        });

        // Update DB
        payment.status = 'refunded';
        payment.refundedAmount = refundAmount;
        await payment.save();

        // Cancel Appointment and Notifications
        const Appointment = require('../models/Appointment');
        const appointment = await Appointment.findOne({ paymentId: paymentIntentId });
        if (appointment) {
            appointment.status = 'cancelled';
            await appointment.save();

            const Notification = require('../models/Notification');
            await Notification.deleteMany({ appointmentId: appointment._id });
            console.log('Cancelled notifications for appointment:', appointment._id);
        }

        res.json({
            message: 'Refund processed',
            refundAmount: refundAmount / 100,
            cancellationFee: CANCELLATION_FEE / 100
        });

    } catch (err) {
        console.error('Error processing refund:', err);
        res.status(500).json({ message: err.message });
    }
});

// 4. Webhook Handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntentSucceeded = event.data.object;
            await Payment.findOneAndUpdate(
                { paymentIntentId: paymentIntentSucceeded.id },
                { status: 'succeeded' }
            );
            console.log('Payment succeeded:', paymentIntentSucceeded.id);
            break;
        case 'payment_intent.payment_failed':
            const paymentIntentFailed = event.data.object;
            await Payment.findOneAndUpdate(
                { paymentIntentId: paymentIntentFailed.id },
                { status: 'failed' }
            );
            console.log('Payment failed:', paymentIntentFailed.id);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.send();
});

module.exports = router;
