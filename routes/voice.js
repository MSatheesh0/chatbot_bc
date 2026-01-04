const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /voice/settings - Get user's voice settings
router.get('/settings', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('voiceSettings');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Return default if not set (Frontend should handle defaults, but this is a fallback)
        const settings = user.voiceSettings || {
            voiceId: '',
            voiceName: '',
            gender: '',
            ttsEnabledForChatbot: false
        };
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PUT /voice/settings - Update user's voice settings
router.put('/settings', auth, async (req, res) => {
    try {
        const { voiceId, voiceName, gender, ttsEnabledForChatbot } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.voiceSettings = {
            voiceId: voiceId || user.voiceSettings.voiceId,
            voiceName: voiceName || user.voiceSettings.voiceName,
            gender: gender || user.voiceSettings.gender,
            ttsEnabledForChatbot: ttsEnabledForChatbot !== undefined ? ttsEnabledForChatbot : user.voiceSettings.ttsEnabledForChatbot
        };

        await user.save();
        res.json(user.voiceSettings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
