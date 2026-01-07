const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// GET /notifications
router.get('/', auth, async (req, res) => {
    try {
        // Return all notifications, or maybe only those that are 'sent' or 'pending' but past due?
        // Usually user wants to see upcoming reminders too?
        // The prompt says "Time notification was sent". This implies we only show sent ones.
        // But for "In-App Notification Page", usually we show history.
        // Let's return all for now, frontend can filter or show status.
        const notifications = await Notification.find({
            userId: req.user.id,
            scheduledTime: { $lte: new Date() }
        })
            .sort({ scheduledTime: -1 });
        res.json(notifications);
    } catch (err) {
        console.error('Error fetching notifications:', err);
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
