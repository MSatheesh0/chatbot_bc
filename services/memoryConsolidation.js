const Groq = require('groq-sdk');
const ModuleMemory = require('../models/ModuleMemory');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Consolidates memory for a specific user and module.
 * This function is designed to be run as a background task or worker job.
 * 
 * @param {string} userId - The ID of the user.
 * @param {string} mode - The chat mode (e.g., 'Mental Health').
 * @param {Array} recentMessages - Array of recent message objects { role, content }.
 */
async function consolidateMemory(userId, mode, recentMessages) {
    console.log(`[Memory Worker] Starting consolidation for User: ${userId}, Mode: ${mode}`);

    try {
        // 1. Fetch Existing Memory
        let userMemory = await ModuleMemory.findOne({ userId, module: mode });
        if (!userMemory) {
            userMemory = new ModuleMemory({ userId, module: mode });
        }

        const currentSummary = userMemory.summary || "None";
        const currentFacts = userMemory.facts && userMemory.facts.length > 0 ? userMemory.facts.join('; ') : "None";
        const currentEmotion = userMemory.emotional_state || "Neutral";

        // 2. Format Recent Chat for LLM
        const chatText = recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

        // 3. Construct the Consolidation Prompt
        const consolidationPrompt = `
        You are a memory consolidation engine.

        Your task is to update the user’s long-term profile based on recent conversation snippets.

        RULES:
        - Modify the existing summary, do NOT rewrite from scratch.
        - Preserve long-term personality traits.
        - Extract only high-confidence facts.
        - Ignore casual or unimportant chatter.
        - Update the emotional state based on the latest interaction.

        INPUT:
        [EXISTING DOSSIER]
        Current Summary: "${currentSummary}"
        Emotional State: "${currentEmotion}"
        Known Facts: "${currentFacts}"

        [RECENT CONVERSATION]
        ${chatText}

        OUTPUT FORMAT (JSON ONLY):
        {
            "updated_summary": "The modified summary text (max 120 words)",
            "emotional_state": "The new emotional state",
            "new_facts": ["fact 1", "fact 2"]
        }
        `;

        // 4. Call LLM
        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: consolidationPrompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const resultText = completion.choices[0]?.message?.content || "{}";
        console.log(`[Memory Worker] LLM Output:`, resultText);

        let resultData;
        try {
            resultData = JSON.parse(resultText);
        } catch (e) {
            // Fallback cleanup if JSON mode fails or returns markdown
            const cleanText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
            resultData = JSON.parse(cleanText);
        }

        // 5. Update Database
        if (resultData) {
            userMemory.summary = resultData.updated_summary || userMemory.summary;
            userMemory.emotional_state = resultData.emotional_state || userMemory.emotional_state;

            if (resultData.new_facts && Array.isArray(resultData.new_facts)) {
                // Add new facts, avoiding duplicates (simple check)
                resultData.new_facts.forEach(fact => {
                    if (!userMemory.facts.includes(fact)) {
                        userMemory.facts.push(fact);
                    }
                });
            }

            userMemory.lastUpdated = Date.now();
            await userMemory.save();
            console.log(`[Memory Worker] Successfully consolidated memory for ${mode}.`);
            return userMemory;
        }

    } catch (err) {
        console.error(`[Memory Worker] Error consolidating memory:`, err.message);
        throw err;
    }
}

module.exports = { consolidateMemory };
