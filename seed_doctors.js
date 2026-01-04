const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Doctor = require('./models/Doctor');

dotenv.config();

const doctors = [
    {
        name: "Dr. Emily Carter",
        specialty: "Cardiologist",
        location: { type: "Point", coordinates: [-73.935242, 40.730610] }, // New York
        address: "123 Heart Lane, New York, NY",
        rating: 4.8,
        experience: 15,
        availability: ["Monday", "Wednesday", "Friday"]
    },
    {
        name: "Dr. James Wilson",
        specialty: "Neurologist",
        location: { type: "Point", coordinates: [-74.005974, 40.712776] }, // New York
        address: "456 Brain Blvd, New York, NY",
        rating: 4.9,
        experience: 20,
        availability: ["Tuesday", "Thursday"]
    },
    {
        name: "Dr. Sarah Lee",
        specialty: "Pediatrician",
        location: { type: "Point", coordinates: [-118.243683, 34.052235] }, // Los Angeles
        address: "789 Kids Way, Los Angeles, CA",
        rating: 4.7,
        experience: 10,
        availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    },
    {
        name: "Dr. Michael Brown",
        specialty: "Dermatologist",
        location: { type: "Point", coordinates: [-87.629799, 41.878113] }, // Chicago
        address: "321 Skin St, Chicago, IL",
        rating: 4.6,
        experience: 8,
        availability: ["Saturday", "Sunday"]
    },
    {
        name: "Dr. Linda Chen",
        specialty: "Psychiatrist",
        location: { type: "Point", coordinates: [-95.369804, 29.760427] }, // Houston
        address: "654 Mind Ave, Houston, TX",
        rating: 4.9,
        experience: 12,
        availability: ["Wednesday", "Friday"]
    }
];

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        await Doctor.deleteMany({}); // Clear existing doctors
        await Doctor.insertMany(doctors);
        console.log('Doctors seeded successfully');
        mongoose.disconnect();
    })
    .catch(err => {
        console.error('Error seeding doctors:', err);
        mongoose.disconnect();
    });
