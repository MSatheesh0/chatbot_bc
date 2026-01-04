const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Appointment = require('../models/Appointment');

// POST /appointments
router.post('/', auth, async (req, res) => {
    try {
        const { doctorId, date, reason } = req.body;
        const newAppointment = new Appointment({
            userId: req.user.id,
            doctorId,
            date: new Date(date),
            reason
        });
        await newAppointment.save();
        res.status(201).json(newAppointment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /appointments/:userId
router.get('/:userId', auth, async (req, res) => {
    try {
        if (req.params.userId !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const appointments = await Appointment.find({ userId: req.params.userId })
            .populate('doctorId')
            .sort({ date: 1 });
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
