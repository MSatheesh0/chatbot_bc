const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
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
    appointmentDate: {
        type: Date,
        required: true
    },
    timeSlot: {
        start: { type: String, required: true },
        end: { type: String, required: true }
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
        default: 'pending'
    },
    patientDetails: {
        name: { type: String, required: true },
        age: { type: Number, required: true },
        gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
        phone: { type: String, required: true },
        symptoms: { type: String, default: '' }
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    cancellationReason: {
        type: String,
        default: ''
    },
    cancelledAt: {
        type: Date
    },
    cancelledBy: {
        type: String,
        enum: ['user', 'doctor', 'admin']
    },
    remindersSent: {
        day24: { type: Boolean, default: false },
        hour2: { type: Boolean, default: false },
        min30: { type: Boolean, default: false }
    }
}, {
    timestamps: true
});

// Index for efficient queries
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ doctorId: 1, appointmentDate: 1 });
bookingSchema.index({ status: 1, appointmentDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
