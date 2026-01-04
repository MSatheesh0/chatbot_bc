const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /settings
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('settings');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.settings || {});
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /settings
router.put('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Update settings
        // We merge existing settings with new ones
        user.settings = { ...user.settings, ...req.body };

        await user.save();
        res.json(user.settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
