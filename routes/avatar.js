const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Avatar = require('../models/Avatar');

// @route   GET /avatars/active
// @desc    Get current user's active avatar
// @access  Private
router.get('/active', auth, async (req, res) => {
  try {
    const avatar = await Avatar.findOne({ userId: req.user.id, isActive: true });

    if (!avatar) {
      // Return a default or empty if none active
      return res.status(404).json({ msg: 'No active avatar found' });
    }

    res.json(avatar);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /avatars/my
// @desc    Get all user's avatars with pagination
// @access  Private
router.get('/my', auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const avatars = await Avatar.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Avatar.countDocuments({ userId: req.user.id });

    res.json({
      avatars,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalAvatars: total
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /avatars
// @desc    Create a new avatar
// @access  Private
router.post('/', auth, async (req, res) => {
  const { name, url, config } = req.body;

  try {
    // Set all other avatars as inactive
    await Avatar.updateMany({ userId: req.user.id }, { isActive: false });

    // Create new avatar as active
    const avatar = new Avatar({
      userId: req.user.id,
      name: name || 'My Avatar',
      url,
      config,
      isActive: true
    });

    await avatar.save();
    res.status(201).json(avatar);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /avatars/set-active
// @desc    Set an avatar as active
// @access  Private
router.put('/set-active', auth, async (req, res) => {
  const { avatarId } = req.body;

  try {
    // Set all user's avatars as inactive
    await Avatar.updateMany({ userId: req.user.id }, { isActive: false });

    // Set the selected one as active
    const avatar = await Avatar.findOneAndUpdate(
      { _id: avatarId, userId: req.user.id },
      { isActive: true },
      { new: true }
    );

    if (!avatar) {
      return res.status(404).json({ msg: 'Avatar not found' });
    }

    res.json(avatar);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /avatars/:id
// @desc    Delete an avatar
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const avatar = await Avatar.findOne({ _id: req.params.id, userId: req.user.id });

    if (!avatar) {
      return res.status(404).json({ msg: 'Avatar not found' });
    }

    if (avatar.isActive) {
      return res.status(400).json({ msg: 'Cannot delete active avatar' });
    }

    await avatar.deleteOne();
    res.json({ msg: 'Avatar removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /avatars/analyze
// @desc    Analyze user input and return emotion/action
// @access  Private
router.post('/analyze', auth, async (req, res) => {
  const { text, audioData, context } = req.body;

  try {
    const { analyzeEmotionAndAction } = require('../services/emotionAnalyzer');
    const { detectLanguage } = require('../services/languageService');

    // Detect language from text or audio
    const language = await detectLanguage(text || audioData);

    // Analyze emotion and determine action
    const { emotion, action } = await analyzeEmotionAndAction({
      text,
      audioData,
      context,
      language
    });

    // Update active avatar's emotion and action
    const avatar = await Avatar.findOne({ userId: req.user.id, isActive: true });
    if (avatar) {
      await avatar.logEmotion(emotion, context);
      avatar.lastAction = action;
      await avatar.save();
    }

    res.json({
      emotion,
      action,
      riskLevel: avatar?.riskLevel || 0,
      language
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /avatars/emergency
// @desc    Handle emergency situation
// @access  Private
router.post('/emergency', auth, async (req, res) => {
  try {
    const avatar = await Avatar.findOne({ userId: req.user.id, isActive: true });

    if (!avatar) {
      return res.status(404).json({ msg: 'Active avatar not found' });
    }

    const emergencyData = await avatar.handleEmergency();
    res.json(emergencyData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /avatars/emotion-history
// @desc    Get emotion history
// @access  Private
router.get('/emotion-history', auth, async (req, res) => {
  try {
    const avatar = await Avatar.findOne({ userId: req.user.id, isActive: true });

    if (!avatar) {
      return res.status(404).json({ msg: 'Active avatar not found' });
    }

    res.json({
      emotionHistory: avatar.emotionHistory,
      riskLevel: avatar.riskLevel
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /avatars/settings
// @desc    Update avatar settings
// @access  Private
router.put('/settings', auth, async (req, res) => {
  const { settings } = req.body;

  try {
    const avatar = await Avatar.findOne({ userId: req.user.id, isActive: true });

    if (!avatar) {
      return res.status(404).json({ msg: 'Active avatar not found' });
    }

    avatar.settings = { ...avatar.settings, ...settings };
    await avatar.save();

    res.json(avatar.settings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /avatars/debug/animation
// @desc    Set debug animation
// @access  Private
router.post('/debug/animation', auth, async (req, res) => {
  const { animationName } = req.body;

  try {
    const avatar = await Avatar.findOne({ userId: req.user.id, isActive: true });

    if (!avatar) {
      return res.status(404).json({ msg: 'Active avatar not found' });
    }

    avatar.settings.debugMode = true;
    avatar.settings.currentAnimation = animationName;
    await avatar.save();

    res.json({ success: true, currentAnimation: animationName });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
