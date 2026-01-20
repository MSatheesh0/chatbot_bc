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
        let [userChat, historyRaw, fetchedMemory] = await Promise.all([
            saveUserMessagePromise,
            historyPromise,
            memoryPromise
        ]);

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
            console.log(`Attempting AI response with Groq (llama-3.3-70b-versatile)`);

            const history = historyRaw.reverse().map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.message
            }));

            // Define prompts for different modes
            let memoryContext = "";
            const globalRules = `
            Core Principle:
            Always respond in a natural, human, conversational way.
            Avoid robotic, textbook, or mechanical answers.

            Global Rules:
            1. Always analyze the full conversation history before responding.
            2. Maintain context, continuity, and memory within the session.
            3. Match your tone to the active module and the user’s mood.
            4. Use simple, everyday language like a real person.
            5. Use contractions and natural phrasing.
            6. Never mention that you are an AI unless explicitly asked.
            7. Do not over-explain unless the user asks.
            8. Sound friendly, calm, and respectful.
            9. Avoid repetitive patterns and canned responses.
            10. Prioritize clarity, warmth, and usefulness.
            `;

            const prompts = {
                "Funny": `
                ${globalRules}
                
                MODULE: Fun / Funny Mode
                - Be light, playful, and engaging.
                - Use humor naturally (no forced jokes).
                - React like a friend.
                - Keep it positive and friendly.

                Tone: Casual • Playful • Relaxed
                `,
                "Search": `
                ${globalRules}

                MODULE: Search Mode
                - Act like a helpful human assistant.
                - Give clear, direct answers.
                - Summarize information simply.
                - Ask a clarification only if the query is vague.
                - Avoid sounding like a search engine.

                Tone: Clear • Neutral • Helpful
                `,
                "Mental Health": `
                ${globalRules}

                MODULE: Mental Health Mode
                - Be empathetic, calm, and emotionally supportive.
                - Acknowledge feelings before giving suggestions.
                - Use validating phrases (“That sounds really hard…”).
                - Ask gentle follow-up questions.
                - Never judge or diagnose.
                - Encourage professional help softly when needed.

                Tone: Warm • Caring • Patient
                `,
                "Study": `
                ${globalRules}

                MODULE: Study Mode
                - Teach like a friendly tutor.
                - Break explanations into simple steps.
                - Use examples and analogies.
                - Encourage learning without pressure.
                - Adjust depth based on user understanding.

                Tone: Supportive • Encouraging • Clear
                `,
                "General": `
                ${globalRules}

                MODULE: General Mode
                - Provide clear, useful, and polite responses.
                - Adapt to the user's tone and needs.
                - Remember context and user details.
                `
            };

            if (userMemory) {
                memoryContext = `
                [PERSISTENT MEMORY - ${mode} Module]
                Summary of past conversations: ${userMemory.summary}
                Key Facts: ${userMemory.facts ? userMemory.facts.join('; ') : ''}
                `;
            }

            // Select prompt based on mode, default to General if not found
            const selectedPrompt = prompts[mode] || prompts["General"];

            const systemPrompt = `
            ${selectedPrompt}

            ${memoryContext}
    
            Respond as an AI assistant. 
            
            FIRST, you MUST provide a JSON object describing the internal state and avatar behavior.
            The JSON must be wrapped in <METADATA> tags.
            
            Follow these Behavioral Rules for the Avatar:
            | Reply Type | Animation | Facial Expression | Speed | Eye State |
            | :--- | :--- | :--- | :--- | :--- |
            | Casual talk | Talking_1 | neutral | 1.0 | normal |
            | Teaching/Explaining | Talking_0 | focused | 1.0 | focused |
            | Emotional support | Talking_2 | sad | 0.7 | soft |
            | Funny/Joke | Laughing | happy | 1.2 | normal |
            | Surprised/Shocked | Idle | surprised | 1.0 | focused |
            | Angry/Stern | Angry | angry | 1.1 | focused |
            | Waiting/Listening | Idle | neutral | 1.0 | normal |
            | Greeting | Wave | smile | 1.0 | normal |
            
            Format:
            <METADATA>
            {
              "mode": "${mode}",
              "avatar": {
                "animation": "one of [Talking_0, Talking_1, Talking_2, Idle, Wave, Laughing, Angry, Crying, Rumba]",
                "facialExpression": "one of [smile, sad, angry, surprised, neutral, funnyFace]",
                "eye_state": "one of [normal, focused, soft]",
                "speed": 0.7 to 1.2
              }
            }
            </METADATA>
            
            Then write your response text naturally.
            `;

            const messages = [
                { role: "system", content: systemPrompt },
                ...history
            ];

            // Set headers for SSE
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            const completionStream = await groq.chat.completions.create({
                messages: messages,
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
                stream: true, // Enable Streaming
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
                            const metadataString = buffer.substring(0, endTagIndex + 11); // Include tag
                            const jsonString = metadataString.replace(/<METADATA>|<\/METADATA>/g, '').trim();

                            try {
                                const metadata = JSON.parse(jsonString);
                                console.log("Parsed Metadata:", metadata);

                                // Send metadata to client
                                res.write(`data: ${JSON.stringify({ type: 'metadata', payload: metadata })}\n\n`);

                                // Update aiData for saving later
                                aiData.emotion = metadata.avatar?.facialExpression || 'neutral';
                                aiData.action = metadata.avatar?.animation || 'Idle';

                                metadataParsed = true;

                                // Process remaining buffer as text
                                const remainingText = buffer.substring(endTagIndex + 11).trimStart();
                                if (remainingText) {
                                    fullResponse += remainingText;
                                    res.write(`data: ${JSON.stringify({ type: 'text', content: remainingText })}\n\n`);
                                }
                                buffer = ""; // Clear buffer
                            } catch (e) {
                                console.error("Failed to parse metadata JSON:", e);
                                // Fallback: just treat as text if parsing fails
                                metadataParsed = true;
                                fullResponse += buffer;
                                res.write(`data: ${JSON.stringify({ type: 'text', content: buffer })}\n\n`);
                                buffer = "";
                            }
                        }
                        // If tag not found yet, keep buffering
                    } else {
                        // Metadata already parsed, stream text directly
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
        userChat.emotion = 'neutral';
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
