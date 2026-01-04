const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Feedback = require('../models/Feedback');
const SupportTicket = require('../models/SupportTicket');

// POST /support/feedback
router.post('/feedback', auth, async (req, res) => {
    try {
        const { message, type, screenshotUrl } = req.body;
        const newFeedback = new Feedback({
            userId: req.user.id,
            message,
            type: type || 'feedback',
            screenshotUrl
        });
        await newFeedback.save();
        res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /support/ticket
router.post('/ticket', auth, async (req, res) => {
    try {
        const { subject, message, category, metadata } = req.body;
        const newTicket = new SupportTicket({
            userId: req.user.id,
            subject,
            message,
            category,
            metadata
        });
        await newTicket.save();
        res.status(201).json({ message: 'Support ticket created successfully', ticketId: newTicket._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /support/tickets (User's tickets)
router.get('/tickets', auth, async (req, res) => {
    try {
        const tickets = await SupportTicket.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
