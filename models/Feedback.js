const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
    type: { type: String, default: 'feedback' }, // 'feedback' or 'bug'
    createdAt: { type: Date, default: Date.now }
}, { collection: 'feedback' });

module.exports = mongoose.model('Feedback', feedbackSchema);
