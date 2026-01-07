const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

// GET /doctors (list all doctors)
router.get('/', async (req, res) => {
    try {
        const { specialty, minRating, maxFee } = req.query;
        let query = { isActive: true };

        if (specialty) query.specialty = specialty;
        if (minRating) query.rating = { $gte: parseFloat(minRating) };
        if (maxFee) query.consultationFee = { $lte: parseFloat(maxFee) };

        const doctors = await Doctor.find(query).sort({ rating: -1 });
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /doctors/nearby
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 50000 } = req.query; // radius in meters, default 50km

        if (!lat || !lng) {
            return res.status(400).json({ message: 'Latitude and Longitude are required' });
        }

        const doctors = await Doctor.find({
            isActive: true,
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

        // Calculate distance for each doctor
        const doctorsWithDistance = doctors.map(doctor => {
            const docObj = doctor.toObject();
            const distance = calculateDistance(
                parseFloat(lat),
                parseFloat(lng),
                doctor.location.coordinates[1],
                doctor.location.coordinates[0]
            );
            docObj.distance = Math.round(distance * 100) / 100; // Round to 2 decimals
            return docObj;
        });

        res.json(doctorsWithDistance);
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

// GET /doctors/:id/availability
router.get('/:id/availability', async (req, res) => {
    try {
        const { date } = req.query;
        const doctor = await Doctor.findById(req.params.id);

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Get the day of week for the requested date
        const requestedDate = date ? new Date(date) : new Date();
        const dayName = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });

        // Find availability for that day
        const dayAvailability = doctor.availability.find(a => a.day === dayName);

        if (!dayAvailability) {
            return res.json({ available: false, slots: [] });
        }

        // Get existing bookings for that date
        const startOfDay = new Date(requestedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(requestedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingBookings = await Booking.find({
            doctorId: req.params.id,
            appointmentDate: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            status: { $in: ['pending', 'confirmed'] }
        });

        // Filter out booked slots
        const bookedSlots = existingBookings.map(b => b.timeSlot.start);
        const availableSlots = dayAvailability.slots.filter(
            slot => !bookedSlots.includes(slot.start)
        );

        res.json({
            available: availableSlots.length > 0,
            slots: availableSlots,
            date: requestedDate
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Helper function to calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}

module.exports = router;
