const mongoose = require('mongoose');

const safetyAlertSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
    category: { type: String, required: true }, // self-harm, violence, emotional distress, etc.
    language: { type: String },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'safety_alerts' });

module.exports = mongoose.model('SafetyAlert', safetyAlertSchema);
