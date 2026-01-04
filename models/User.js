const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    dob: { type: Date },
    profilePhoto: { type: String }, // URL or base64 string
    avatar: { type: mongoose.Schema.Types.ObjectId, ref: 'Avatar' },
    rpmUserId: { type: String },
    rpmToken: { type: String },
    currentAvatarId: { type: String },
    voiceSettings: {
        voiceId: { type: String, default: '21m00Tcm4TlvDq8ikWAM' }, // Default to Rachel
        voiceName: { type: String, default: 'Rachel' },
        gender: { type: String, default: 'female' },
        ttsEnabledForChatbot: { type: Boolean, default: false }
    },
    settings: {
        language: { type: String, default: 'English' },
        timeZone: { type: String, default: 'Auto (UTC+05:30)' },
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        isDarkMode: { type: Boolean, default: false },
        fontSize: { type: String, default: 'Medium' },
        isVoiceEnabled: { type: Boolean, default: true },
        defaultMode: { type: String, default: 'Chat' },
        emergencyContact: {
            name: { type: String, default: '' },
            phone: { type: String, default: '' },
            relationship: { type: String, default: '' }
        }
    },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'users' });

module.exports = mongoose.model('User', userSchema);
