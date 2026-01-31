const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    default: 'My Avatar'
  },
  url: {
    type: String,
    required: true
  },
  config: {
    type: Object,
    default: {}
  },
  avatarData: {
    type: Object,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: false
  },
  emotionHistory: [{
    emotion: {
      type: String,
      enum: ['calm', 'sad', 'anxious', 'angry', 'stressed', 'panic', 'neutral'],
      default: 'neutral'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    context: String,
    riskScore: Number
  }],
  settings: {
    emergencyContact: String,
    emergencyMessage: {
      type: String,
      default: 'I need help! This is an emergency. My current location is: '
    },
    language: {
      type: String,
      default: 'en'
    },
    debugMode: {
      type: Boolean,
      default: false
    },
    currentAnimation: String
  },
  lastEmotion: {
    type: String,
    enum: ['calm', 'sad', 'anxious', 'angry', 'stressed', 'panic', 'neutral'],
    default: 'neutral'
  },
  lastAction: {
    type: String,
    enum: ['no_action', 'breathing', 'suggest_doctor', 'emergency_check', 'open_doctor'],
    default: 'no_action'
  },
  riskLevel: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, { timestamps: true });

// Index for faster lookups
avatarSchema.index({ userId: 1 });
avatarSchema.index({ userId: 1, isActive: 1 });

// Method to log emotion and update risk level
avatarSchema.methods.logEmotion = async function (emotion, context = '') {
  this.emotionHistory.push({
    emotion,
    context,
    timestamp: Date.now(),
    riskScore: this.calculateRiskScore(emotion)
  });

  this.lastEmotion = emotion;
  await this.updateRiskLevel();
  await this.save();
};

// Helper to calculate risk score
avatarSchema.methods.calculateRiskScore = function (emotion) {
  const scores = {
    'calm': 0,
    'neutral': 10,
    'sad': 40,
    'anxious': 60,
    'stressed': 70,
    'angry': 80,
    'panic': 100
  };
  return scores[emotion] || 0;
};

// Method to update overall risk level
avatarSchema.methods.updateRiskLevel = async function () {
  const timeWindow = Date.now() - (30 * 60 * 1000); // Last 30 minutes
  const recentEmotions = this.emotionHistory.filter(
    entry => entry.timestamp >= timeWindow
  );

  if (recentEmotions.length === 0) {
    this.riskLevel = 0;
    return;
  }

  const totalRisk = recentEmotions.reduce((sum, entry) => sum + (entry.riskScore || 0), 0);
  this.riskLevel = Math.min(100, Math.round(totalRisk / recentEmotions.length));
  await this.save();
};

// Method to get current emotion and action
avatarSchema.methods.getEmotionAndAction = function () {
  return {
    emotion: this.lastEmotion,
    action: this.lastAction,
    riskLevel: this.riskLevel
  };
};

// Method to handle emergency
avatarSchema.methods.handleEmergency = async function () {
  this.lastAction = 'emergency_check';
  this.riskLevel = 100;
  await this.save();

  // Return emergency data for client
  return {
    emergencyContact: this.settings.emergencyContact,
    emergencyMessage: this.settings.emergencyMessage,
    locationRequired: true
  };
};

const Avatar = mongoose.model('Avatar', avatarSchema);

module.exports = Avatar;
