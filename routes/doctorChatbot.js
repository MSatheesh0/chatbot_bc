const express = require('express');
const router = express.Router();
const DoctorConversation = require('../models/DoctorConversation');
const Doctor = require('../models/Doctor');
const auth = require('../middleware/auth');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Emergency keywords
const EMERGENCY_KEYWORDS = [
    'suicide', 'kill myself', 'end my life', 'want to die',
    'self harm', 'hurt myself', 'emergency', 'crisis'
];

// POST /chatbot/doctor/:doctorId - Chat with doctor bot
router.post('/doctor/:doctorId', auth, async (req, res) => {
    try {
        const { message } = req.body;
        const { doctorId } = req.params;

        // Get doctor details
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Check for emergency
        const isEmergency = EMERGENCY_KEYWORDS.some(keyword =>
            message.toLowerCase().includes(keyword)
        );

        // Find or create conversation
        let conversation = await DoctorConversation.findOne({
            userId: req.user.id,
            doctorId,
            isActive: true
        });

        if (!conversation) {
            conversation = new DoctorConversation({
                userId: req.user.id,
                doctorId,
                messages: []
            });
        }

        // Add user message
        conversation.messages.push({
            sender: 'user',
            message,
            timestamp: new Date()
        });

        // Handle emergency
        if (isEmergency) {
            conversation.emergencyDetected = true;
            await conversation.save();

            const emergencyResponse = {
                sender: 'bot',
                message: `I've detected that you might be in crisis. Please reach out to emergency services immediately:\n\n🆘 National Suicide Prevention Lifeline: 1-800-273-8255\n🆘 Crisis Text Line: Text HOME to 741741\n\nYour safety is the top priority. Please contact these services or visit the nearest emergency room.`,
                timestamp: new Date()
            };

            conversation.messages.push(emergencyResponse);
            await conversation.save();

            return res.json({
                response: emergencyResponse.message,
                isEmergency: true
            });
        }

        // Generate AI response with STRICT rules
        const availableDays = doctor.availability && doctor.availability.length > 0
            ? doctor.availability.map(a => a.day).join(', ')
            : 'Not specified';

        const timeSlots = doctor.availability && doctor.availability.length > 0
            ? doctor.availability.map(a =>
                `${a.day}: ${a.slots.map(s => `${s.start}-${s.end}`).join(', ')}`
            ).join(' | ')
            : 'Not specified';

        const systemPrompt = `You are a Doctor-Specific Medical Information Assistant.

You are strictly assigned to ONE doctor only: Dr. ${doctor.name}.
You must answer user questions using ONLY the information provided below.

---------------------------------------
STRICT RULES (MANDATORY)
---------------------------------------
1. Respond ONLY based on the assigned doctor's data below.
2. Do NOT mention or compare any other doctor.
3. Do NOT provide general medical advice outside the doctor's scope.
4. Do NOT diagnose diseases or prescribe medicines.
5. If the requested information is NOT available in the doctor's data, reply exactly:
   "This information is not available for this doctor."
6. Keep responses short, clear, professional, and patient-friendly.
7. If the user asks a question unrelated to this doctor, reply:
   "I can answer questions only about Dr. ${doctor.name}."
8. Always encourage booking an appointment for medical consultation.

---------------------------------------
DOCTOR PROFILE DATA
---------------------------------------
Doctor ID: ${doctor._id}
Name: Dr. ${doctor.name}
Specialization: ${doctor.specialty}
Qualification: ${doctor.qualification}
Years of Experience: ${doctor.experience} years
Clinic / Hospital Name: ${doctor.hospital.name}
Clinic Address: ${doctor.hospital.address}
Hospital Phone: ${doctor.hospital.phone}
Consultation Fees: ₹${doctor.consultationFee}
Available Days: ${availableDays}
Available Time Slots: ${timeSlots}
Languages Spoken: ${doctor.languages ? doctor.languages.join(', ') : 'English'}
Rating: ${doctor.rating} ⭐ (${doctor.reviewCount} reviews)

About Doctor:
${doctor.bio || 'No bio available.'}

---------------------------------------
RESPONSE INSTRUCTIONS
---------------------------------------
- Answer ONLY the user question.
- Use simple, respectful, empathetic language.
- Do NOT add extra explanations unless asked.
- Do NOT include disclaimers unless asked.
- If user asks about symptoms or treatment, say: "For proper diagnosis and treatment, please book an appointment with Dr. ${doctor.name}."
- If user asks about booking, provide the available days and time slots.
- Maximum response length: 150 words.
`;

        // Build conversation history for Groq
        const chatHistory = conversation.messages.slice(-10).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.message
        }));

        const messages = [
            { role: "system", content: systemPrompt },
            ...chatHistory
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            max_tokens: 250,
        });

        const botResponse = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response.";

        // Add bot response
        conversation.messages.push({
            sender: 'bot',
            message: botResponse,
            timestamp: new Date()
        });

        await conversation.save();

        res.json({
            response: botResponse,
            isEmergency: false,
            conversationId: conversation._id
        });

    } catch (err) {
        console.error('Chatbot error:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET /chatbot/history/:conversationId - Get conversation history
router.get('/history/:conversationId', auth, async (req, res) => {
    try {
        const conversation = await DoctorConversation.findById(req.params.conversationId)
            .populate('doctorId', 'name specialty hospital');

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        res.json(conversation);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /chatbot/doctor/:doctorId/conversations - Get all conversations with a doctor
router.get('/doctor/:doctorId/conversations', auth, async (req, res) => {
    try {
        const conversations = await DoctorConversation.find({
            userId: req.user.id,
            doctorId: req.params.doctorId
        }).sort({ updatedAt: -1 });

        res.json(conversations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
