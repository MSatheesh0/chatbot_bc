const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true
    },
    doctorName: {
        type: String,
        required: true
    },
    reminderType: {
        type: String,
        enum: ['24h', '2h'],
        required: true
    },
    scheduledTime: {
        type: Date,
        required: true
    },
    sentStatus: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'cancelled'],
        default: 'pending'
    },
    readStatus: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
