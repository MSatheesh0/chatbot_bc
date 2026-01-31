const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth');

// POST /appointments - Create a new appointment
router.post('/', auth, async (req, res) => {
    try {
        const { doctorId, doctorName, hospitalName, amount, qrCodeData } = req.body;

        const appointment = new Appointment({
            userId: req.user.id,
            doctorId,
            doctorName,
            hospitalName,
            amount,
            qrCodeData,
            date: new Date() // For now, defaulting to current time
        });

        await appointment.save();

        res.status(201).json(appointment);
    } catch (err) {
        console.error('Error creating appointment:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /appointments/:id - Get single appointment
router.get('/:id', auth, async (req, res) => {
    try {
        const appointment = await Appointment.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        res.json(appointment);
    } catch (err) {
        console.error('Error fetching appointment:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /appointments - Get all appointments for the user
router.get('/', auth, async (req, res) => {
    try {
        const appointments = await Appointment.find({ userId: req.user.id })
            .sort({ date: -1 }); // Newest first

        res.json(appointments);
    } catch (err) {
        console.error('Error fetching appointments:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /appointments/:id/cancel - Cancel appointment
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        const appointment = await Appointment.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (appointment.status !== 'confirmed') {
            return res.status(400).json({ message: 'Only confirmed appointments can be cancelled' });
        }

        // Logic: Charge 2/3 as cancellation fee, refund 1/3
        const totalAmount = appointment.amount;
        const fee = (totalAmount * 2) / 3;
        const refund = totalAmount - fee;

        appointment.status = 'cancelled';
        appointment.cancellationFee = fee;
        appointment.refundAmount = refund;

        await appointment.save();

        res.json({
            message: 'Appointment cancelled successfully',
            appointment,
            cancellationFee: fee,
            refundAmount: refund
        });
    } catch (err) {
        console.error('Error cancelling appointment:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /appointments/:id - Delete appointment history
router.delete('/:id', auth, async (req, res) => {
    try {
        const appointment = await Appointment.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        res.json({ message: 'Appointment history deleted permanently' });
    } catch (err) {
        console.error('Error deleting appointment:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
