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

module.exports = router;
