const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
    address: { type: String },
    rating: { type: Number, default: 0 },
    experience: { type: Number },
    availability: [{ type: String }], // e.g., ["Monday", "Wednesday"]
    createdAt: { type: Date, default: Date.now }
}, { collection: 'doctors' });

doctorSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Doctor', doctorSchema);
