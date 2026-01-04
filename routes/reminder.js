const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Reminder = require('../models/Reminder');

// POST /reminders
router.post('/', auth, async (req, res) => {
    try {
        const { message, description, time, repeat, action, vibration } = req.body;
        const newReminder = new Reminder({
            userId: req.user.id,
            message,
            description,
            time: new Date(time),
            repeat: repeat || 'None',
            action: action || 'wave',
            vibration: vibration || false
        });
        await newReminder.save();
        res.status(201).json(newReminder);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /reminders/:userId
router.get('/:userId', auth, async (req, res) => {
    try {
        // Ensure user can only see their own reminders
        if (req.params.userId !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const reminders = await Reminder.find({ userId: req.params.userId }).sort({ time: 1 });
        res.json(reminders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /reminders/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const reminder = await Reminder.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });
        if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
        res.json({ message: 'Reminder deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /reminders/:id
router.put('/:id', auth, async (req, res) => {
    try {
        const { message, description, time, repeat, action, isActive, vibration } = req.body;

        const updateData = {};
        if (message) updateData.message = message;
        if (description) updateData.description = description;
        if (time) updateData.time = new Date(time);
        if (repeat) updateData.repeat = repeat;
        if (action) updateData.action = action;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (vibration !== undefined) updateData.vibration = vibration;

        const reminder = await Reminder.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            updateData,
            { new: true }
        );

        if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
        res.json(reminder);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
