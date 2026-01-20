const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const axios = require('axios');
require('dotenv').config();

// Curated List of 10 High-Quality ElevenLabs Voices
const VOICES = [
    // Male
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', description: 'Deep, American, Narration' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', description: 'Well-rounded, American' },
    { id: 'VR6AewLTigWg4xSOukaG', name: 'Arnold', gender: 'male', description: 'Crisp, American' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'male', description: 'Youthful, American' },
    { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'male', description: 'Raspy, American' },
    // Female
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', description: 'Calm, American' },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', description: 'Strong, American' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', description: 'Soft, American' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'female', description: 'Young, British' },
    { id: 'piTKgcLEGmPE4e6mEKli', name: 'Nicole', gender: 'female', description: 'Whisper, Australian' }
];

// GET /voice/list - Get available voices
router.get('/list', auth, (req, res) => {
    res.json(VOICES);
});

// POST /voice/speak - Generate audio from text
router.post('/speak', auth, async (req, res) => {
    try {
        const { text, voiceId } = req.body;

        if (!text) return res.status(400).json({ message: 'Text is required' });

        // Default to Rachel if no voiceId provided
        const targetVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM';

        const apiKey = process.env.ELEVEN_LABS_API_KEY;
        if (!apiKey) {
            console.error("ELEVEN_LABS_API_KEY is missing in .env");
            return res.status(503).json({ message: 'TTS Service Unavailable (Key Missing)' });
        }

        const response = await axios({
            method: 'post',
            url: `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`,
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            data: {
                text: text,
                model_id: "eleven_turbo_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            },
            responseType: 'arraybuffer' // Get raw binary data
        });

        // Send the audio buffer to the client
        res.set('Content-Type', 'audio/mpeg');
        res.send(response.data);

    } catch (err) {
        console.error("ElevenLabs API Error:", err.response?.data || err.message);
        if (err.response?.status === 401) {
            return res.status(401).json({ message: 'Invalid API Key' });
        }
        if (err.response?.status === 402 || err.response?.data?.detail?.status === "quota_exceeded") {
            return res.status(402).json({ message: 'Quota Exceeded' });
        }
        res.status(500).json({ message: 'TTS Generation Failed' });
    }
});

// GET /voice/settings - Get user's voice settings
router.get('/settings', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('voiceSettings');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Return default if not set
        const settings = user.voiceSettings || {
            voiceId: '21m00Tcm4TlvDq8ikWAM', // Default to Rachel
            voiceName: 'Rachel',
            gender: 'female',
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
