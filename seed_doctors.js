require('dotenv').config();
const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');

// List of all cities from IndianLocations (frontend)
const locations = {
    'Andhra Pradesh': {
        'Visakhapatnam': [83.2185, 17.6869],
        'Vijayawada': [80.6480, 16.5062],
        'Guntur': [80.4365, 16.3067],
        'Nellore': [79.9865, 14.4426],
        'Kurnool': [78.0373, 15.8281],
        'Tirupati': [79.4192, 13.6288],
        'Rajahmundry': [81.8040, 17.0005],
        'Kakinada': [82.2475, 16.9891],
    },
    'Arunachal Pradesh': {
        'Itanagar': [93.6053, 27.0844],
        'Naharlagun': [93.7000, 27.1000],
        'Pasighat': [95.3260, 28.0660],
        'Tawang': [91.8570, 27.5860],
    },
    'Assam': {
        'Guwahati': [91.7362, 26.1445],
        'Silchar': [92.7789, 24.8333],
        'Dibrugarh': [94.9120, 27.4728],
        'Jorhat': [94.2037, 26.7509],
        'Nagaon': [92.6856, 26.3484],
        'Tinsukia': [95.3600, 27.4900],
    },
    'Bihar': {
        'Patna': [85.1376, 25.5941],
        'Gaya': [85.0002, 24.7955],
        'Bhagalpur': [86.9842, 25.2425],
        'Muzaffarpur': [85.3906, 26.1225],
        'Darbhanga': [85.8918, 26.1542],
        'Purnia': [87.4753, 25.7771],
    },
    'Chhattisgarh': {
        'Raipur': [81.6296, 21.2514],
        'Bhilai': [81.3833, 21.2167],
        'Bilaspur': [82.1409, 22.0797],
        'Korba': [82.7501, 22.3595],
        'Durg': [81.2800, 21.1900],
    },
    'Goa': {
        'Panaji': [73.8278, 15.4909],
        'Margao': [73.9500, 15.2700],
        'Vasco da Gama': [73.8115, 15.3983],
        'Mapusa': [73.8100, 15.5900],
    },
    'Gujarat': {
        'Ahmedabad': [72.5714, 23.0225],
        'Surat': [72.8311, 21.1702],
        'Vadodara': [73.1812, 22.3072],
        'Rajkot': [70.8022, 22.3039],
        'Bhavnagar': [72.1519, 21.7645],
        'Jamnagar': [70.0577, 22.4707],
        'Gandhinagar': [72.6369, 23.2156],
        'Anand': [72.9289, 22.5645],
    },
    'Haryana': {
        'Faridabad': [77.3178, 28.4089],
        'Gurgaon': [77.0266, 28.4595],
        'Panipat': [76.9635, 29.3909],
        'Ambala': [76.7767, 30.3782],
        'Karnal': [76.9905, 29.6857],
        'Rohtak': [76.6066, 28.8955],
    },
    'Himachal Pradesh': {
        'Shimla': [77.1734, 31.1048],
        'Manali': [77.1887, 32.2396],
        'Dharamshala': [76.3234, 32.2190],
        'Kullu': [77.1093, 31.9578],
        'Solan': [77.0967, 30.9045],
    },
    'Jharkhand': {
        'Ranchi': [85.3096, 23.3441],
        'Jamshedpur': [86.2029, 22.8046],
        'Dhanbad': [86.4304, 23.7957],
        'Bokaro': [86.1511, 23.6693],
        'Hazaribagh': [85.3615, 23.9929],
    },
    'Karnataka': {
        'Bangalore': [77.5946, 12.9716],
        'Mysore': [76.6394, 12.2958],
        'Mangalore': [74.8560, 12.9141],
        'Hubli': [75.1240, 15.3647],
        'Belgaum': [74.4977, 15.8497],
        'Gulbarga': [76.8343, 17.3297],
        'Davangere': [75.9218, 14.4644],
        'Bellary': [76.9214, 15.1394],
    },
    'Kerala': {
        'Thiruvananthapuram': [76.9366, 8.5241],
        'Kochi': [76.2673, 9.9312],
        'Kozhikode': [75.7804, 11.2588],
        'Thrissur': [76.2144, 10.5276],
        'Kollam': [76.6141, 8.8932],
        'Kannur': [75.3704, 11.8745],
        'Alappuzha': [76.3388, 9.4981],
    },
    'Madhya Pradesh': {
        'Indore': [75.8577, 22.7196],
        'Bhopal': [77.4126, 23.2599],
        'Jabalpur': [79.9864, 23.1815],
        'Gwalior': [78.1828, 26.2183],
        'Ujjain': [75.7885, 23.1765],
        'Sagar': [78.7378, 23.8388],
    },
    'Maharashtra': {
        'Mumbai': [72.8777, 19.0760],
        'Pune': [73.8567, 18.5204],
        'Nagpur': [79.0882, 21.1458],
        'Nashik': [73.7898, 19.9975],
        'Aurangabad': [75.3433, 19.8762],
        'Solapur': [75.9064, 17.6599],
        'Thane': [72.9781, 19.2183],
        'Kolhapur': [74.2433, 16.7050],
    },
    'Manipur': {
        'Imphal': [93.9368, 24.8170],
        'Thoubal': [93.9833, 24.6333],
        'Bishnupur': [93.7667, 24.6167],
    },
    'Meghalaya': {
        'Shillong': [91.8933, 25.5788],
        'Tura': [90.2036, 25.5138],
        'Jowai': [92.2000, 25.4500],
    },
    'Mizoram': {
        'Aizawl': [92.7176, 23.7271],
        'Lunglei': [92.7333, 22.8833],
        'Champhai': [93.3167, 23.4833],
    },
    'Nagaland': {
        'Kohima': [94.1086, 25.6747],
        'Dimapur': [93.7267, 25.9067],
        'Mokokchung': [94.5167, 26.3167],
    },
    'Odisha': {
        'Bhubaneswar': [85.8245, 20.2961],
        'Cuttack': [85.8828, 20.4625],
        'Rourkela': [84.8536, 22.2604],
        'Puri': [85.8312, 19.8135],
        'Berhampur': [84.7941, 19.3150],
    },
    'Punjab': {
        'Ludhiana': [75.8573, 30.9010],
        'Amritsar': [74.8723, 31.6340],
        'Jalandhar': [75.5762, 31.3260],
        'Patiala': [76.3869, 30.3398],
        'Bathinda': [74.9455, 30.2110],
        'Mohali': [76.7179, 30.7046],
    },
    'Rajasthan': {
        'Jaipur': [75.7873, 26.9124],
        'Jodhpur': [73.0243, 26.2389],
        'Udaipur': [73.7125, 24.5854],
        'Kota': [75.8648, 25.2138],
        'Ajmer': [74.6399, 26.4499],
        'Bikaner': [73.3119, 28.0229],
    },
    'Sikkim': {
        'Gangtok': [88.6065, 27.3389],
        'Namchi': [88.3667, 27.1667],
        'Gyalshing': [88.0500, 27.2833],
    },
    'Tamil Nadu': {
        'Chennai': [80.2707, 13.0827],
        'Coimbatore': [76.9558, 11.0168],
        'Madurai': [78.1198, 9.9252],
        'Tiruchirappalli': [78.7047, 10.7905],
        'Salem': [78.1460, 11.6643],
        'Tirunelveli': [77.7567, 8.7139],
        'Erode': [77.7172, 11.3410],
        'Vellore': [79.1325, 12.9165],
        'Thoothukudi': [78.1348, 8.7642],
        'Thanjavur': [79.1378, 10.7870],
    },
    'Telangana': {
        'Hyderabad': [78.4867, 17.3850],
        'Warangal': [79.6000, 17.9784],
        'Nizamabad': [78.0941, 18.6725],
        'Khammam': [80.1514, 17.2473],
        'Karimnagar': [79.1288, 18.4386],
    },
    'Tripura': {
        'Agartala': [91.2868, 23.8315],
        'Udaipur': [91.4833, 23.5333],
        'Dharmanagar': [92.1667, 24.3667],
    },
    'Uttar Pradesh': {
        'Lucknow': [80.9462, 26.8467],
        'Kanpur': [80.3319, 26.4499],
        'Ghaziabad': [77.4538, 28.6692],
        'Agra': [78.0081, 27.1767],
        'Varanasi': [82.9739, 25.3176],
        'Meerut': [77.7064, 28.9845],
        'Allahabad': [81.8463, 25.4358],
        'Bareilly': [79.4304, 28.3670],
    },
    'Uttarakhand': {
        'Dehradun': [78.0322, 30.3165],
        'Haridwar': [78.1642, 29.9457],
        'Roorkee': [77.8880, 29.8543],
        'Haldwani': [79.5130, 29.2183],
        'Rudrapur': [79.4004, 28.9845],
    },
    'West Bengal': {
        'Kolkata': [88.3639, 22.5726],
        'Howrah': [88.2636, 22.5958],
        'Durgapur': [87.3119, 23.5204],
        'Asansol': [86.9524, 23.6739],
        'Siliguri': [88.3953, 26.7271],
        'Darjeeling': [88.2663, 27.0410],
    },
    'Delhi': {
        'New Delhi': [77.2090, 28.6139],
        'Delhi': [77.1025, 28.7041],
        'Dwarka': [77.0460, 28.5921],
        'Rohini': [77.0736, 28.7495],
    },
    'Puducherry': {
        'Puducherry': [79.8083, 11.9416],
        'Karaikal': [79.8380, 10.9254],
        'Mahe': [75.5360, 11.7014],
    },
    'Jammu and Kashmir': {
        'Srinagar': [74.7973, 34.0837],
        'Jammu': [74.8570, 32.7266],
        'Anantnag': [75.1486, 33.7311],
        'Baramulla': [74.3434, 34.2095],
    },
    'Ladakh': {
        'Leh': [77.5771, 34.1526],
        'Kargil': [76.1313, 34.5539],
    },
};

const specialties = [
    'Psychiatrist',
    'Psychologist',
    'Therapist',
    'Counselor',
    'Clinical Psychologist'
];

const qualifications = [
    'MBBS, MD (Psychiatry)',
    'M.Phil (Clinical Psychology)',
    'PhD (Psychology)',
    'MSc (Counseling Psychology)',
    'DPM (Psychiatry)'
];

const names = [
    'Dr. Sharma', 'Dr. Patel', 'Dr. Gupta', 'Dr. Singh', 'Dr. Reddy',
    'Dr. Kumar', 'Dr. Rao', 'Dr. Mehta', 'Dr. Verma', 'Dr. Iyer',
    'Dr. Nair', 'Dr. Das', 'Dr. Chatterjee', 'Dr. Banerjee', 'Dr. Joshi',
    'Dr. Kulkarni', 'Dr. Deshmukh', 'Dr. Patil', 'Dr. Yadav', 'Dr. Mishra'
];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomCoordinate(baseCoord) {
    // Add small random variation to coordinates (approx 1-2km radius)
    const variation = (Math.random() - 0.5) * 0.04;
    return baseCoord + variation;
}

const seedDoctors = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing doctors
        await Doctor.deleteMany({});
        console.log('Cleared existing doctors');

        const doctors = [];

        // Iterate through each state and city
        for (const [state, cities] of Object.entries(locations)) {
            for (const [city, coords] of Object.entries(cities)) {
                // Create 3-5 doctors for each city
                const numDoctors = Math.floor(Math.random() * 3) + 3; // 3 to 5

                for (let i = 0; i < numDoctors; i++) {
                    const name = `${getRandomItem(names)} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}.`;
                    const specialty = getRandomItem(specialties);

                    doctors.push({
                        name: name,
                        specialty: specialty,
                        qualification: getRandomItem(qualifications),
                        experience: Math.floor(Math.random() * 20) + 5,
                        rating: (Math.random() * 1.5 + 3.5).toFixed(1),
                        reviewCount: Math.floor(Math.random() * 200) + 20, // Changed from reviews to reviewCount
                        consultationFee: Math.floor(Math.random() * 1500) + 500,
                        bio: `Experienced ${specialty} with a focus on mental well-being and holistic care.`, // Changed from about to bio
                        location: {
                            type: 'Point',
                            coordinates: [
                                getRandomCoordinate(coords[0]),
                                getRandomCoordinate(coords[1])
                            ]
                        },
                        hospital: {
                            name: `${city} ${specialty} Center`,
                            address: `${Math.floor(Math.random() * 100)}, Main Road, ${city}, ${state}`,
                            phone: '+91 98765 43210' // Added required phone field
                        },
                        // Simplified availability to match schema if needed, or just keep empty for now as it's complex
                        availability: [],
                        profileImage: 'https://img.freepik.com/free-photo/doctor-with-his-arms-crossed-white-background_1368-5790.jpg', // Changed from image to profileImage
                        languages: ['English', 'Hindi', 'Tamil']
                    });
                }
            }
        }

        await Doctor.insertMany(doctors);
        console.log(`Successfully seeded ${doctors.length} doctors across India!`);

        mongoose.disconnect();
    } catch (err) {
        console.error('Error seeding doctors:', err);
        mongoose.disconnect();
    }
};

seedDoctors();
