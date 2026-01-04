const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    description: { type: String },
    time: { type: Date, required: true },
    repeat: { type: String, enum: ['None', 'Daily', 'Weekly', 'Monthly'], default: 'None' },
    vibration: { type: Boolean, default: false },
    action: { type: String, default: 'wave' },
    isActive: { type: Boolean, default: true },
    isTriggered: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'reminders' });

module.exports = mongoose.model('Reminder', reminderSchema);
