const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Avatar = require('../models/Avatar');

// POST /avatars (save avatar URL)
router.post('/', auth, async (req, res) => {
    try {
        const { name, url, config } = req.body;

        // Deactivate all other avatars for this user
        await Avatar.updateMany({ user: req.user.id }, { isActive: false });

        const newAvatar = new Avatar({
            name,
            url,
            config,
            user: req.user.id,
            isActive: true // Set new avatar as active
        });
        await newAvatar.save();
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
        res.json(avatar);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
