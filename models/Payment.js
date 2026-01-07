const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentIntentId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true }, // in paise
    currency: { type: String, default: 'inr' },
    status: { type: String, required: true }, // succeeded, pending, failed, refunded
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: String },
    refundedAmount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
