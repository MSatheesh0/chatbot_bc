const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ConsentLog = require('../models/ConsentLog');

// POST /consent/log
router.post('/log', auth, async (req, res) => {
    try {
        const { consentType, version, status } = req.body;
        const newLog = new ConsentLog({
            userId: req.user.id,
            consentType,
            version,
            status,
            ipAddress: req.ip
        });
        await newLog.save();
        res.status(201).json({ message: 'Consent logged successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /consent/history
router.get('/history', auth, async (req, res) => {
    try {
        const logs = await ConsentLog.find({ userId: req.user.id }).sort({ timestamp: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
