const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Doctor = require('../models/Doctor');
const auth = require('../middleware/auth');

// POST /bookings - Create new booking
router.post('/', auth, async (req, res) => {
    try {
        const {
            doctorId,
            appointmentDate,
            timeSlot,
            patientDetails
        } = req.body;

        // Validate required fields
        if (!doctorId || !appointmentDate || !timeSlot || !patientDetails) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if doctor exists
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Check if slot is already booked
        const existingBooking = await Booking.findOne({
            doctorId,
            appointmentDate: new Date(appointmentDate),
            'timeSlot.start': timeSlot.start,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingBooking) {
            return res.status(400).json({ message: 'This time slot is already booked' });
        }

        // Create booking
        const booking = new Booking({
            userId: req.user.id,
            doctorId,
            appointmentDate: new Date(appointmentDate),
            timeSlot,
            patientDetails,
            status: 'pending'
        });

        await booking.save();

        // Populate doctor details
        await booking.populate('doctorId');

        res.status(201).json(booking);
    } catch (err) {
        console.error('Booking creation error:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET /bookings/user/:userId - Get user's bookings
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const { status } = req.query;
        let query = { userId: req.params.userId };

        if (status) {
            query.status = status;
        }

        const bookings = await Booking.find(query)
            .populate('doctorId')
            .populate('paymentId')
            .sort({ appointmentDate: -1 });

        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /bookings/:id - Get specific booking
router.get('/:id', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('doctorId')
            .populate('paymentId');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /bookings/:id/cancel - Cancel booking
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        const { reason } = req.body;
        const booking = await Booking.findById(req.params.id).populate('paymentId');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if booking belongs to user
        if (booking.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Check if booking can be cancelled
        if (booking.status === 'cancelled' || booking.status === 'completed') {
            return res.status(400).json({ message: 'Booking cannot be cancelled' });
        }

        // Calculate refund amount
        const payment = await Payment.findById(booking.paymentId);
        let refundAmount = 0;
        const cancellationCharge = 50;

        if (payment && payment.status === 'success') {
            const appointmentDate = new Date(booking.appointmentDate);
            const now = new Date();
            const hoursUntilAppointment = (appointmentDate - now) / (1000 * 60 * 60);

            if (hoursUntilAppointment > 24) {
                // Full refund minus cancellation charge
                refundAmount = payment.amount - cancellationCharge;
            } else if (hoursUntilAppointment > 0) {
                // 50% refund minus cancellation charge
                refundAmount = (payment.amount * 0.5) - cancellationCharge;
            }
            // else: No refund for no-show

            // Update payment with refund info
            payment.refundStatus = 'initiated';
            payment.refundAmount = Math.max(0, refundAmount);
            payment.cancellationCharge = cancellationCharge;
            await payment.save();
        }

        // Update booking
        booking.status = 'cancelled';
        booking.cancellationReason = reason || 'User cancelled';
        booking.cancelledAt = new Date();
        booking.cancelledBy = 'user';
        await booking.save();

        res.json({
            message: 'Booking cancelled successfully',
            booking,
            refundAmount: Math.max(0, refundAmount)
        });
    } catch (err) {
        console.error('Cancellation error:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET /bookings/:id/status - Get booking status
router.get('/:id/status', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .select('status appointmentDate timeSlot')
            .populate('doctorId', 'name hospital');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
