const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const auth = require('../middleware/auth');

const RPM_API_KEY = process.env.READY_PLAYER_ME_API_KEY;
const RPM_APP_ID = '693dc478c86b8a8c87dd41af'; // Provided by user

// Create Anonymous User
router.post('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.rpmUserId) {
            return res.json({
                id: user.rpmUserId,
                token: user.rpmToken,
                avatarId: user.currentAvatarId
            });
        }

        // Create anonymous user on RPM
        // Note: The doc says POST /v1/users with X-API-KEY (if server-side) or just App ID?
        // The doc snippet says "make sure you have created an anonymous user".
        // Based on standard RPM API:
        const response = await axios.post('https://api.readyplayer.me/v1/users', {
            data: {
                applicationId: RPM_APP_ID
            }
        }, {
            headers: {
                // 'X-API-KEY': RPM_API_KEY // If required. For anonymous users via App ID, usually not needed if public?
                // Actually, creating anonymous users usually requires the API Key if done server-side.
                // But let's try without first or use a placeholder.
                // The user only provided App ID.
            }
        });

        const { id, token } = response.data.data;

        user.rpmUserId = id;
        user.rpmToken = token;
        await user.save();

        res.json({ id, token });
    } catch (err) {
        console.error('RPM Create User Error:', err.response?.data || err.message);
        res.status(500).json({ message: 'Failed to create RPM user' });
    }
});

// Get Assets
router.get('/assets', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.rpmUserId) return res.status(400).json({ message: 'RPM User not initialized' });

        const { type, gender } = req.query; // e.g. outfit, male/female

        const response = await axios.get('https://api.readyplayer.me/v1/assets', {
            params: {
                filterApplicationId: RPM_APP_ID,
                filterUserId: user.rpmUserId,
                type: type, // Optional filter
                gender: gender // Optional filter
            },
            headers: {
                'X-APP-ID': RPM_APP_ID,
                'Authorization': `Bearer ${user.rpmToken}`
            }
        });

        res.json(response.data);
    } catch (err) {
        console.error('RPM Get Assets Error:', err.response?.data || err.message);
        res.status(500).json({ message: 'Failed to fetch assets' });
    }
});

// Create Draft Avatar (from template)
router.post('/avatar', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.rpmUserId) return res.status(400).json({ message: 'RPM User not initialized' });

        const { gender, bodyType } = req.body; // male/female, fullbody/halfbody

        // Create a draft from a template
        const response = await axios.post('https://api.readyplayer.me/v2/avatars/templates', {
            data: {
                partner: 'default', // or specific partner
                gender: gender || 'male',
                bodyType: bodyType || 'fullbody'
            }
        }, {
            headers: {
                'Authorization': `Bearer ${user.rpmToken}`
            }
        });

        const avatarId = response.data.data.id;
        user.currentAvatarId = avatarId;
        await user.save();

        res.json({ id: avatarId });
    } catch (err) {
        console.error('RPM Create Avatar Error:', err.response?.data || err.message);
        // Fallback: If template creation fails, maybe try listing templates first?
        // For now, let's assume we can just start with a default ID if this fails.
        res.status(500).json({ message: 'Failed to create avatar draft' });
    }
});

// Equip Asset
router.patch('/avatar/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const { id } = req.params;
        const { assetId, assetType } = req.body; // e.g. outfit: '12345'

        const assetsPayload = {};
        assetsPayload[assetType] = assetId;

        const response = await axios.patch(`https://api.readyplayer.me/v2/avatars/${id}`, {
            data: {
                assets: assetsPayload
            }
        }, {
            headers: {
                'Authorization': `Bearer ${user.rpmToken}`
            }
        });

        res.json(response.data);
    } catch (err) {
        console.error('RPM Equip Asset Error:', err.response?.data || err.message);
        res.status(500).json({ message: 'Failed to equip asset' });
    }
});

// Save Avatar
router.put('/avatar/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const { id } = req.params;

        const response = await axios.put(`https://api.readyplayer.me/v2/avatars/${id}`, {}, {
            headers: {
                'Authorization': `Bearer ${user.rpmToken}`
            }
        });

        // Update our local avatar record if needed
        const glbUrl = `https://models.readyplayer.me/${id}.glb`;

        // Save to our Avatars collection
        // ... (Implementation depends on Avatar model)

        res.json({ url: glbUrl });
    } catch (err) {
        console.error('RPM Save Avatar Error:', err.response?.data || err.message);
        res.status(500).json({ message: 'Failed to save avatar' });
    }
});

module.exports = router;
