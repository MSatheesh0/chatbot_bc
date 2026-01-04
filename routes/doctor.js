const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');

// GET /doctors (list all doctors)
router.get('/', async (req, res) => {
    try {
        const doctors = await Doctor.find();
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /doctors/nearby
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 5000 } = req.query; // radius in meters, default 5km

        if (!lat || !lng) {
            return res.status(400).json({ message: 'Latitude and Longitude are required' });
        }

        const doctors = await Doctor.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseInt(radius)
                }
            }
        });
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /doctors/:id
router.get('/:id', async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
        res.json(doctor);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
