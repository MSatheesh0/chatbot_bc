const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    config: { type: Object, default: {} },

    // Gender Identification Fields
    avatarId: { type: String },
    gender: {
        type: String,
        enum: ['male', 'female', 'unknown'],
        default: 'unknown'
    },
    bodyType: { type: String }, // 'masculine', 'feminine' from API
    confidence: { type: Number, default: 0 }, // 1.0 = API confirmed

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'avatars' });

module.exports = mongoose.model('Avatar', avatarSchema);
