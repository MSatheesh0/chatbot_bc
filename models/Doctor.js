const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    specialty: { type: String, required: true, default: 'Psychiatrist' },
    qualification: { type: String, required: true },
    experience: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    consultationFee: { type: Number, required: true, min: 0 },
    hospital: {
        name: { type: String, required: true },
        address: { type: String, required: true },
        phone: { type: String, required: true }
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
    address: { type: String },
    availability: [{
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        slots: [{
            start: String,
            end: String
        }]
    }],
    profileImage: { type: String, default: '' },
    languages: [{ type: String }],
    bio: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'doctors' });

doctorSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Doctor', doctorSchema);
