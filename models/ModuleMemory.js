const mongoose = require('mongoose');

const moduleMemorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    module: { type: String, required: true }, // e.g., 'Mental Health', 'Study', 'Search', 'Funny'
    summary: { type: String, default: '' }, // Long-term summary of the user's context in this module
    emotional_state: { type: String, default: 'Neutral' }, // Current emotional state of the user
    facts: [{ type: String }], // Specific extracted facts (e.g., "Name is Ram", "Anxious about exams")
    lastUpdated: { type: Date, default: Date.now }
}, { collection: 'module_memories' });

// Compound index to ensure unique memory per user per module
moduleMemorySchema.index({ userId: 1, module: 1 }, { unique: true });

module.exports = mongoose.model('ModuleMemory', moduleMemorySchema);
