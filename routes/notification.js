const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// GET /notifications
router.get('/', auth, async (req, res) => {
    try {
        // Return all notifications for the user
        const notifications = await Notification.find({
            userId: req.user.id
        })
            .sort({ scheduledTime: -1 });
        res.json(notifications);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /notifications/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /notifications/:id/read
router.put('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { readStatus: true },
            { new: true }
        );
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json(notification);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
