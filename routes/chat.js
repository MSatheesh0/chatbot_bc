const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const Conversation = require('../models/Conversation');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /chat/message
router.post('/message', auth, async (req, res) => {
    console.log("Incoming Chat Request:", {
        userId: req.user.id,
        body: req.body
    });

    const { message, mode, conversationId } = req.body;

    if (!message) {
        console.error("Chat Error: Message is missing in request body");
        return res.status(400).json({ error: "Message is required" });
    }

    try {
        // 1. Get or Create Conversation
        let conversation;
        if (conversationId) {
            conversation = await Conversation.findById(conversationId);
        }

        if (!conversation) {
            conversation = new Conversation({
                participants: [req.user.id],
                title: message.substring(0, 30), // Set title to first message
                mode: mode || 'General'
            });
            await conversation.save();
        } else {
            // Check if this is the first message (to update title)
            const messageCount = await Chat.countDocuments({ conversationId: conversation._id });
            if (messageCount === 0) {
                conversation.title = message.substring(0, 30);
                await conversation.save();
            }
        }

        // 2. Save User Message
        const userChat = new Chat({
            conversationId: conversation._id,
            sender: 'user',
            message,
            type: 'text'
        });
        await userChat.save();

        // 3. Get AI Response
        let aiData;

        try {
            console.log(`Attempting AI response with Groq (llama-3.3-70b-versatile)`);

            // Fetch conversation history for context
            const historyRaw = await Chat.find({ conversationId: conversation._id })
                .sort({ createdAt: -1 })
                .limit(10);

            const history = historyRaw.reverse().map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.message
            }));

            // Define prompts for different modes
            const prompts = {
                "Funny": `
                You are a funny and playful AI assistant.
                Use light humor, jokes, and a cheerful tone.
                Keep replies short and entertaining.
                Avoid serious, emotional, or factual explanations.
                The goal is to make the user smile or laugh.
                `,
                "Search": `
                You are an information-focused AI assistant.
                Answer using accurate, factual, and neutral language.
                Be clear and concise.
                Avoid jokes, emotions, and personal opinions.
                If the answer is unknown, say so honestly.
                `,
                "Mental Health": `
                You are an empathetic mental health support assistant.
                Listen carefully and validate the user’s emotions.
                Respond calmly, kindly, and without judgment.
                Maintain emotional continuity across messages.
                If emotions change suddenly, gently ask what changed.
                Never dismiss, rush, or criticize the user.
                `,
                "Study": `
                You are a patient and supportive tutor.
                Explain concepts step-by-step in simple language.
                Use examples to improve understanding.
                Encourage questions and learning.
                Avoid jokes and emotional counseling.
                `,
                "General": `
                You are a helpful and friendly AI assistant.
                Provide clear, useful, and polite responses.
                Adapt to the user's tone and needs.
                `
            };

            // Select prompt based on mode, default to General if not found
            const selectedPrompt = prompts[mode] || prompts["General"];

            const systemPrompt = `
            ${selectedPrompt}
    
            Respond as an AI assistant. Your response MUST be a valid JSON object with exactly these fields:
            {
                "reply": "your text response",
                "emotion": "one word describing the assistant's emotion (e.g., happy, neutral, sad, excited)",
                "action": "one word describing a physical action (e.g., wave, nod, think, idle)",
                "userEmotion": "one word describing the user's detected emotion based on their message (e.g., stressed, happy, anxious, neutral)"
            }
            Return ONLY the JSON.
            `;

            const messages = [
                { role: "system", content: systemPrompt },
                ...history
            ];

            const completion = await groq.chat.completions.create({
                messages: messages,
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
            });

            const responseText = completion.choices[0]?.message?.content || "";
            console.log(`AI Response from Groq:`, responseText);

            const jsonMatch = responseText.match(/\{.*\}/s);
            aiData = jsonMatch ? JSON.parse(jsonMatch[0]) : { reply: responseText, emotion: 'neutral', action: 'idle', userEmotion: 'neutral' };

        } catch (err) {
            console.warn(`Failed with Groq:`, err.message);
            if (err.status === 429 || err.message.includes('429')) {
                console.error("Rate limit exceeded for Groq API.");
                return res.status(429).json({
                    error: "AI Rate Limit Exceeded",
                    details: "Please try again later."
                });
            }
            throw err;
        }

        if (!aiData) {
            throw new Error("Failed to generate valid response");
        }

        // 4. Update User Message with detected emotion
        // We need to find the userChat we just saved and update it, or just update the object if we haven't saved it yet?
        // We saved it in step 2.
        // Let's update it now.
        // Wait, we don't have the _id of userChat easily unless we kept the object.
        // We did: const userChat = new Chat({...}); await userChat.save();
        // So userChat._id is available.

        userChat.emotion = aiData.userEmotion || 'neutral';
        await userChat.save();

        // 5. Save AI Response in chats collection
        const aiChat = new Chat({
            conversationId: conversation._id,
            sender: 'ai',
            message: aiData.reply,
            emotion: aiData.emotion,
            action: aiData.action,
            type: 'text'
        });
        await aiChat.save();

        // 5. Update Conversation
        conversation.lastMessage = aiData.reply;
        conversation.updatedAt = Date.now();
        await conversation.save();

        res.json(aiData);
    } catch (err) {
        console.error('CHAT ERROR:', err);
        // If headers already sent (e.g. 429), don't send again
        if (!res.headersSent) {
            res.status(500).json({
                error: "Internal Server Error",
                details: err.message
            });
        }
    }
});

// GET /chat/conversations
router.get('/conversations', auth, async (req, res) => {
    try {
        const { mode } = req.query;
        const query = { participants: { $in: [req.user.id] } };
        if (mode) {
            query.mode = mode;
        }
        const conversations = await Conversation.find(query).sort({ updatedAt: -1 });
        res.json(conversations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /chat/messages/:conversationId
router.get('/messages/:conversationId', auth, async (req, res) => {
    try {
        const messages = await Chat.find({
            conversationId: req.params.conversationId
        }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /chat/conversations/:conversationId
router.delete('/conversations/:conversationId', auth, async (req, res) => {
    try {
        await Chat.deleteMany({ conversationId: req.params.conversationId });
        await Conversation.findByIdAndDelete(req.params.conversationId);
        res.json({ message: 'Conversation deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /chat/conversations (New Chat)
router.post('/conversations', auth, async (req, res) => {
    try {
        const { title, mode } = req.body;
        const conversation = new Conversation({
            participants: [req.user.id],
            title: title || 'New Chat',
            mode: mode || 'General'
        });
        await conversation.save();
        res.status(201).json(conversation);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
