const mongoose = require('mongoose');

const doctorConversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    messages: [{
        sender: {
            type: String,
            enum: ['user', 'bot'],
            required: true
        },
        message: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    bookingCreated: {
        type: Boolean,
        default: false
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    emergencyDetected: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
doctorConversationSchema.index({ userId: 1, doctorId: 1 });
doctorConversationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DoctorConversation', doctorConversationSchema);
