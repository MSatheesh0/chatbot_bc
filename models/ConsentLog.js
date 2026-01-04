const mongoose = require('mongoose');

const consentLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    consentType: { type: String, required: true }, // e.g., 'DataUsage', 'Marketing'
    version: { type: String, required: true },
    status: { type: String, enum: ['Accepted', 'Withdrawn'], required: true },
    ipAddress: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ConsentLog', consentLogSchema);
