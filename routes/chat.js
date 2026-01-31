const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const Conversation = require('../models/Conversation');

const ModuleMemory = require('../models/ModuleMemory');
const { consolidateMemory } = require('../services/memoryConsolidation');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Simple In-Memory Cache for Memory (for single instance)
// Key: userId:module -> Value: { summary, facts, timestamp }
const memoryCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// AI Speech Refinement Function
async function refineSpeech(rawText) {
    try {
        console.log(`[STT Refinement] Refining: "${rawText}"`);
        const refinementPrompt = `
You are an advanced multilingual speech-to-text engine.

Primary Task:
- Convert spoken voice input into accurate, clean text.

Language Handling (Critical):
- Automatically detect the spoken language.
- Preserve the original language exactly as spoken.
- Do NOT translate.
- Do NOT normalize into English.
- Do NOT ask for language confirmation.

Accuracy Rules:
- Transcribe naturally spoken words, including informal speech.
- Preserve meaning over literal perfection.
- Handle accents, pauses, and emotional speech correctly.
- Avoid adding words not spoken by the user.

Emotion-Aware Transcription:
- Preserve hesitation, emotional cues, and natural phrasing.
- Do NOT remove fillers if they reflect emotion.
- Do NOT rewrite sentences into formal language.

Output Rules:
- Output ONLY the transcribed text.
- Do NOT add explanations, summaries, or responses.
- Do NOT repeat the text multiple times.
- Do NOT include timestamps, labels, or metadata.

Strict Restrictions:
- Never generate chatbot replies.
- Never echo system instructions.
- Never include punctuation that changes emotional meaning.
- Never guess missing words; if unclear, transcribe to best confidence.
`;

        const response = await groq.chat.completions.create({
            messages: [
                { role: "system", content: refinementPrompt },
                { role: "user", content: rawText }
            ],
            model: "llama-3.1-8b-instant", // Use a fast model for refinement
            temperature: 0.1, // Keep it deterministic
            max_tokens: 100
        });

        const refinedText = response.choices[0]?.message?.content?.trim();
        console.log(`[STT Refinement] Result: "${refinedText}"`);
        return refinedText || rawText;
    } catch (err) {
        console.error("STT Refinement Error:", err);
        return rawText; // Fallback to raw text on error
    }
}

// POST /chat/message
router.post('/message', auth, async (req, res) => {
    console.log("Incoming Chat Request:", {
        userId: req.user.id,
        body: req.body
    });

    let { message, mode, conversationId, isVoice } = req.body;

    if (!message) {
        console.error("Chat Error: Message is missing in request body");
        return res.status(400).json({ error: "Message is required" });
    }

    try {
        // 0. Refine Speech if it's a voice message
        if (isVoice) {
            message = await refineSpeech(message);
        }
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

        // 2. Prepare Parallel Promises
        const saveUserMessagePromise = new Chat({
            conversationId: conversation._id,
            sender: 'user',
            message,
            type: 'text'
        }).save();

        const historyPromise = Chat.find({ conversationId: conversation._id })
            .sort({ createdAt: -1 })
            .limit(10);

        // 3a. Fetch Module Memory (Isolated Context) with Caching
        let memoryPromise;
        const cacheKey = `${req.user.id}:${mode}`;
        let userMemory = memoryCache.get(cacheKey);

        console.log(`[Memory] Fetching for ${cacheKey}. In Cache: ${!!userMemory}`);

        if (!userMemory || (Date.now() - userMemory.timestamp > CACHE_TTL)) {
            console.log(`[Memory] Cache miss or expired. Fetching from DB...`);
            memoryPromise = ModuleMemory.findOne({ userId: req.user.id, module: mode });
        } else {
            console.log(`[Memory] Using cached memory.`);
            memoryPromise = Promise.resolve(userMemory);
        }

        // 3. Execute Parallel Fetching
        // Fetch history BEFORE saving the current message to avoid duplication in AI context
        let [historyRaw, fetchedMemory] = await Promise.all([
            historyPromise,
            memoryPromise
        ]);

        // Now save the current message
        await saveUserMessagePromise;

        // Process Memory Result
        if (!userMemory && fetchedMemory) {
            // If it was a DB fetch, update cache and variable
            userMemory = fetchedMemory;
            // Update Cache
            console.log(`[Memory] Loaded from DB:`, userMemory.facts);
            memoryCache.set(cacheKey, {
                summary: userMemory.summary,
                facts: userMemory.facts,
                timestamp: Date.now()
            });
        } else if (fetchedMemory && !fetchedMemory._id) {
            // It was from cache (simple object), so userMemory is already set
        }

        // 3b. Get AI Response
        let aiData = { reply: "", emotion: "neutral", action: "idle" };

        try {
            const history = historyRaw.reverse().map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.message
            }));

            // Select Model based on Mode for speed/quality
            let modelName = "llama-3.3-70b-versatile"; // Default fast Groq model
            if (mode === "Search" || mode === "Mental Health") {
                // Use Gemini for better reasoning/search-like tasks if needed, 
                // but Groq is usually faster. Let's stick to Groq but optimize prompts.
            }

            const globalRules = `
            Core Principle: Natural, human, conversational.
            Rules:
            1. Analyze full history.
            2. Match tone to module.
            3. Simple language.
            4. No "I am an AI".
            5. Response MUST be 20-35 words.
            6. Response MUST NOT exceed 4 lines.
            `;

            const prompts = {
                "Funny": `${globalRules}\nMode: Fun. Be playful, use humor naturally. Tone: Casual.`,
                "Search": `${globalRules}\nMode: Search. Clear, direct answers. Summarize simply. Tone: Helpful.`,
                "Mental Health": `${globalRules}\nMode: Mental Health. Gentle, empathetic, patient. Validate emotions. Tone: Warm.`,
                "Study": `${globalRules}\nMode: Study. Friendly tutor. Step-by-step explanations. Tone: Supportive.`,
                "General": `${globalRules}\nMode: General. adapt to user tone.`
            };

            let memoryContext = userMemory ? `Memory: ${userMemory.summary}. Facts: ${userMemory.facts.join('; ')}` : "";

            const systemPrompt = `
You are an intelligent avatar-based assistant.
${memoryContext}
${prompts[mode] || prompts["General"]}

SAFETY & RISK DETECTION:
1. Analyze the user's input for:
   - Self-harm or death
   - Harm to others or violence
   - Severe emotional/mental distress (panic, deep depression)
2. If detected, classify:
   - riskLevel: Low | Medium | High
   - category: self-harm | violence | emotional_distress | panic | other
3. If risk is Medium or High, gently suggest professional help (e.g., "I'm here for you. Would you like to talk to a professional?").

LANGUAGE & SENTIMENT RULES:
1. Detect the user's language automatically.
2. Respond ONLY in the SAME language and script.
3. Perform deep sentiment analysis on the user's input regardless of language.
4. Select metadata (action/emotion) that matches the emotional tone of the conversation.

AVATAR SYNC:
Include <METADATA> block BEFORE text.
Format:
<METADATA>
action: <idle|wave|walk|happy|angry|yell|talking|sad|angry_point|excited|happy_walk|kneeling|laying|rejected|sitting_angry|sitting_disbelief|sleeping|dance>
emotion: <neutral|happy|sad|angry|surprised|excited>
eyeState: <normal|focused|soft|blink>
speed: <0.8-1.2>
safetyDetected: <true|false>
safetyRisk: <Low|Medium|High>
safetyCategory: <category_name>
</METADATA>

Rules:
- If user asks for action (dance, wave, etc), use it.
- While speaking, default to "talking" unless specific action is better.
- Language choice must NOT affect the avatar's pose or size.
`;

            const messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: message }
            ];

            // Set headers for SSE
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            const completionStream = await groq.chat.completions.create({
                messages: messages,
                model: modelName,
                temperature: 0.7,
                stream: true,
            });

            let fullResponse = "";
            let buffer = "";
            let metadataParsed = false;

            for await (const chunk of completionStream) {
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) {
                    buffer += content;

                    if (!metadataParsed) {
                        const endTagIndex = buffer.indexOf('</METADATA>');
                        if (endTagIndex !== -1) {
                            const metadataString = buffer.substring(0, endTagIndex + 11);

                            try {
                                const rawContent = metadataString.replace(/<METADATA>|<\/METADATA>/g, '').trim();
                                const metadata = {};
                                rawContent.split('\n').forEach(line => {
                                    const [key, value] = line.split(':').map(s => s.trim());
                                    if (key && value) {
                                        metadata[key] = isNaN(value) ? value : parseFloat(value);
                                    }
                                });

                                // Handle Safety Alert
                                if (metadata.safetyDetected === 'true' || metadata.safetyDetected === true) {
                                    const SafetyAlert = require('../models/SafetyAlert');
                                    const newAlert = new SafetyAlert({
                                        user: req.user.id,
                                        message: message, // Original user message
                                        riskLevel: metadata.safetyRisk || 'Low',
                                        category: metadata.safetyCategory || 'emotional_distress',
                                        language: 'auto'
                                    });
                                    await newAlert.save();

                                    // Inject safety info into payload for frontend
                                    metadata.safety = {
                                        detected: true,
                                        riskLevel: metadata.safetyRisk,
                                        category: metadata.safetyCategory
                                    };
                                }

                                const payload = {
                                    mode: mode,
                                    avatar: {
                                        animation: metadata.action || 'idle',
                                        facialExpression: metadata.emotion || 'neutral',
                                        speed: metadata.speed || 1.0,
                                        eye_state: metadata.eyeState || 'normal'
                                    },
                                    safety: metadata.safety || null
                                };

                                res.write(`data: ${JSON.stringify({ type: 'metadata', payload: payload })}\n\n`);

                                aiData.emotion = metadata.emotion || 'neutral';
                                aiData.action = metadata.action || 'idle';
                                metadataParsed = true;

                                const remainingText = buffer.substring(endTagIndex + 11).trimStart();
                                if (remainingText) {
                                    fullResponse += remainingText;
                                    res.write(`data: ${JSON.stringify({ type: 'text', content: remainingText })}\n\n`);
                                }
                                buffer = "";
                            } catch (e) {
                                console.error("Failed to parse metadata:", e);
                                metadataParsed = true;
                                fullResponse += buffer;
                                res.write(`data: ${JSON.stringify({ type: 'text', content: buffer })}\n\n`);
                                buffer = "";
                            }
                        }
                    } else {
                        fullResponse += content;
                        res.write(`data: ${JSON.stringify({ type: 'text', content: content })}\n\n`);
                    }
                }
            }

            res.write('data: [DONE]\n\n');
            res.end();

            console.log(`AI Response (Streamed):`, fullResponse);

            aiData.reply = fullResponse;

        } catch (err) {
            console.warn(`Failed with Groq:`, err.message);
            if (!res.headersSent) {
                res.status(500).json({ error: err.message });
            }
            return; // Stop execution
        }

        // 4. Update User Message with detected emotion (default to neutral for now)
        // Note: We don't have a separate sentiment analyzer here, but we can use the one from metadata if available
        // For now, let's just save the user message as is.

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

        // 6. Update Avatar Emotion History if active avatar exists
        try {
            const Avatar = require('../models/Avatar');
            const avatar = await Avatar.findOne({ userId: req.user.id, isActive: true });
            if (avatar) {
                await avatar.logEmotion(aiData.emotion, message);
                avatar.lastAction = aiData.action;
                await avatar.save();
            }
        } catch (avatarErr) {
            console.error("Failed to update avatar emotion:", avatarErr.message);
        }

        // 7. Update Conversation
        conversation.lastMessage = aiData.reply;
        conversation.updatedAt = Date.now();
        await conversation.save();
        // Response already sent via stream

        // 6. Background Task: Update Module Memory
        // Force update for now to ensure memory works reliably
        const shouldUpdateMemory = true;

        console.log(`[Memory] Checking update for mode: ${mode}. Should update: ${shouldUpdateMemory}`);

        if (shouldUpdateMemory) {
            try {
                // Prepare recent messages for the worker
                const recentMessages = [
                    { role: 'user', content: message },
                    { role: 'ai', content: aiData.reply }
                ];

                // Call the Memory Worker Service
                const updatedMemory = await consolidateMemory(req.user.id, mode, recentMessages);

                if (updatedMemory) {
                    // Update Cache
                    const cacheKey = `${req.user.id}:${mode}`;
                    memoryCache.set(cacheKey, {
                        summary: updatedMemory.summary,
                        facts: updatedMemory.facts,
                        emotional_state: updatedMemory.emotional_state,
                        timestamp: Date.now()
                    });
                }
            } catch (memErr) {
                console.error("Failed to update module memory:", memErr.message);
            }
        }
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
