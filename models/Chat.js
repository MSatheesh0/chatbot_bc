const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: String, required: true }, // Changed from ObjectId to String for flexibility
    message: { type: String, required: true },
    type: { type: String, enum: ['text', 'image', 'system'], default: 'text' },
    emotion: { type: String },
    action: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'chats' });

module.exports = mongoose.model('Chat', chatSchema);
