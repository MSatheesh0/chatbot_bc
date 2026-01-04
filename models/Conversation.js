const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    title: { type: String, default: 'New Conversation' },
    mode: { type: String, default: 'General' },
    lastMessage: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'conversations' });

module.exports = mongoose.model('Conversation', conversationSchema);
