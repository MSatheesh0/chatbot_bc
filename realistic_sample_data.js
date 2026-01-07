// Enhanced Sample Data - More Realistic
// Based on publicly available information from hospital websites

const realisticSampleDoctors = [
    // Data inspired by real hospitals but with modified details
    {
        name: "Dr. Rajesh Sharma",
        specialty: "Psychiatrist",
        qualification: "MBBS, MD (Psychiatry), DPM",
        experience: 15,
        rating: 4.7,
        reviewCount: 234,
        consultationFee: 1000,
        hospital: {
            name: "Apollo Hospitals",
            address: "Greams Road, Chennai, Tamil Nadu 600006",
            phone: "+91-44-28296000", // Real Apollo Chennai number
            website: "https://www.apollohospitals.com"
        },
        location: {
            type: "Point",
            coordinates: [80.2500, 13.0569] // Real Apollo Chennai location
        },
        availability: [
            { day: "Monday", slots: [{ start: "10:00", end: "13:00" }] },
            { day: "Wednesday", slots: [{ start: "10:00", end: "13:00" }] },
            { day: "Friday", slots: [{ start: "15:00", end: "18:00" }] }
        ],
        languages: ["English", "Hindi", "Tamil"],
        bio: "Specialized in anxiety disorders, depression, and stress management. Practicing psychiatrist with focus on cognitive behavioral therapy.",
        profileImage: "https://via.placeholder.com/150",
        isActive: true,
        // Add disclaimer
        disclaimer: "This is sample data for demonstration. Please verify details before booking."
    },
    // Add more realistic samples...
];

module.exports = realisticSampleDoctors;
