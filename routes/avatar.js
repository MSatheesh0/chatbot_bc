const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const Avatar = require('../models/Avatar');
const User = require('../models/User');
const axios = require('axios');

const VOICES = {
    male: { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh' },
    female: { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' }
};

// POST /avatars (save avatar URL)
router.post('/', auth, async (req, res) => {
    try {
        const { name, url, config } = req.body;

        // Extract Avatar ID from URL
        // URL format: https://models.readyplayer.me/64b...glb
        const urlParts = url.split('/');
        const filename = urlParts[urlParts.length - 1];
        const avatarId = filename.replace('.glb', '');

        // Fetch Metadata from Ready Player Me API
        let gender = 'unknown';
        let bodyType = 'unknown';
        let confidence = 0;

        try {
            const metadataRes = await axios.get(`https://api.readyplayer.me/v1/avatars/${avatarId}.json`);
            const metadata = metadataRes.data;

            if (metadata.outfitGender) {
                bodyType = metadata.outfitGender; // 'masculine' or 'feminine'
                if (bodyType === 'masculine') gender = 'male';
                else if (bodyType === 'feminine') gender = 'female';
                confidence = 1.0;
            }
        } catch (apiErr) {
            console.error('Failed to fetch RPM metadata:', apiErr.message);
            // Fallback: could analyze geometry here if needed, or leave as unknown
        }

        // Deactivate all other avatars for this user
        await Avatar.updateMany({ user: req.user.id }, { isActive: false });

        const newAvatar = new Avatar({
            name,
            url,
            config,
            avatarId,
            gender,
            bodyType,
            confidence,
            user: req.user.id,
            isActive: true // Set new avatar as active
        });
        await newAvatar.save();

        // Sync User Voice Settings if gender is known
        if (gender !== 'unknown' && VOICES[gender]) {
            await User.findByIdAndUpdate(req.user.id, {
                'voiceSettings.gender': gender,
                'voiceSettings.voiceId': VOICES[gender].id,
                'voiceSettings.voiceName': VOICES[gender].name
            });
        }

        res.status(201).json(newAvatar);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /avatars/my (list current user's avatars)
router.get('/my', auth, async (req, res) => {
    try {
        const avatars = await Avatar.find({ user: req.user.id });
        res.json(avatars);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /avatars/active/:userId (get active avatar for specific user)
router.get('/active/:userId', auth, async (req, res) => {
    try {
        let avatar = await Avatar.findOne({ user: req.params.userId, isActive: true });

        if (!avatar) {
            // Fallback: Find the most recent avatar
            const latestAvatar = await Avatar.findOne({ user: req.params.userId }).sort({ createdAt: -1 });

            if (latestAvatar) {
                latestAvatar.isActive = true;
                await latestAvatar.save();
                avatar = latestAvatar;
            }
        }

        if (!avatar) return res.status(404).json({ message: 'No active avatar found' });
        res.json(avatar);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /avatars/active (get current active avatar for logged in user)
router.get('/active', auth, async (req, res) => {
    try {
        let avatar = await Avatar.findOne({ user: req.user.id, isActive: true });

        if (!avatar) {
            // Fallback: Find the most recent avatar
            const latestAvatar = await Avatar.findOne({ user: req.user.id }).sort({ createdAt: -1 });

            if (latestAvatar) {
                latestAvatar.isActive = true;
                await latestAvatar.save();
                avatar = latestAvatar;
            }
        }

        if (!avatar) return res.status(404).json({ message: 'No active avatar found' });
        res.json(avatar);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /avatars/:userId (list user avatars)
router.get('/:userId', auth, async (req, res) => {
    try {
        const avatars = await Avatar.find({ user: req.params.userId });
        res.json(avatars);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /avatars/:avatarId
router.delete('/:avatarId', auth, async (req, res) => {
    try {
        const avatar = await Avatar.findOneAndDelete({
            _id: req.params.avatarId,
            user: req.user.id
        });
        if (!avatar) return res.status(404).json({ message: 'Avatar not found or unauthorized' });
        res.json({ message: 'Avatar deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /avatars/set-active
router.put('/set-active', auth, async (req, res) => {
    try {
        const { avatarId } = req.body;

        // Deactivate all avatars for this user
        await Avatar.updateMany({ user: req.user.id }, { isActive: false });

        // Set the selected avatar as active
        const avatar = await Avatar.findOneAndUpdate(
            { _id: avatarId, user: req.user.id },
            { isActive: true },
            { new: true }
        );

        if (!avatar) return res.status(404).json({ message: 'Avatar not found or unauthorized' });

        // Sync User Voice Settings if gender is known
        if (avatar.gender && avatar.gender !== 'unknown' && VOICES[avatar.gender]) {
            await User.findByIdAndUpdate(req.user.id, {
                'voiceSettings.gender': avatar.gender,
                'voiceSettings.voiceId': VOICES[avatar.gender].id,
                'voiceSettings.voiceName': VOICES[avatar.gender].name
            });
        }

        res.json(avatar);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
