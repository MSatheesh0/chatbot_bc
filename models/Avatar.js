const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    config: { type: Object, default: {} },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'avatars' });

module.exports = mongoose.model('Avatar', avatarSchema);
