const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');

// Helper to map emotion to score and type
const getEmotionScore = (emotion) => {
    if (!emotion) return { score: 50, type: 'neutral' };
    const e = emotion.toLowerCase();
    if (['happy', 'excited', 'joy', 'love', 'grateful'].includes(e)) return { score: 90, type: 'positive' };
    if (['calm', 'relaxed', 'content', 'neutral'].includes(e)) return { score: 70, type: 'positive' }; // Neutral is slightly positive/stable
    if (['sad', 'depressed', 'lonely', 'grief'].includes(e)) return { score: 30, type: 'negative' };
    if (['angry', 'frustrated', 'annoyed'].includes(e)) return { score: 20, type: 'negative' };
    if (['stressed', 'anxious', 'fear', 'worried'].includes(e)) return { score: 40, type: 'negative' };
    return { score: 50, type: 'neutral' };
};

// GET /analysis/emotions
router.get('/emotions', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Fetch chats where the *user* is the sender (if we want user's emotions) 
        // OR fetch system messages if we are analyzing the AI's perception of the user.
        // Usually, 'emotion' field in Chat model might be the detected emotion of the USER.
        // Let's assume we look at all chats in conversations involving the user.

        // However, the Chat model has a 'sender' field which is a string. 
        // And 'conversationId'. We need to find conversations for this user first.
        // But simpler: The Chat model doesn't directly link to User, it links to Conversation.
        // We need to find conversations where the user is a participant.

        const Conversation = require('../models/Conversation');

        // Filter by Mode/Model
        const modeMap = {
            'Mental Health': 'Mental Health',
            'Chat': 'Chat',
            'Funny': 'Funny',
            'Study': 'Study'
        };

        const modelParam = req.query.model || 'Mental Health'; // Default to Mental Health
        const modeQuery = { mode: modeMap[modelParam] || modelParam };

        const conversations = await Conversation.find({
            participants: userId,
            ...modeQuery
        });
        const conversationIds = conversations.map(c => c._id);

        // Determine Date Range
        const range = req.query.range || '7days';
        let startDate = new Date();
        let endDate = new Date(); // Default to now

        // Reset time to start of day for accurate comparisons
        startDate.setHours(0, 0, 0, 0);

        if (range === 'today') {
            // startDate is already today 00:00
            endDate.setHours(23, 59, 59, 999);
        } else if (range === 'yesterday') {
            startDate.setDate(startDate.getDate() - 1);
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
        } else if (range === '7days') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (range === 'this_week') {
            // Start of current week (assuming Monday start)
            const day = startDate.getDay() || 7; // 1 (Mon) to 7 (Sun)
            if (day !== 1) startDate.setHours(-24 * (day - 1));
        } else if (range === 'last_week') {
            // Start of last week
            const day = startDate.getDay() || 7;
            startDate.setHours(-24 * (day - 1 + 7));

            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else if (range === '30days') {
            startDate.setDate(startDate.getDate() - 30);
        } else if (range === 'this_month') {
            startDate.setDate(1); // 1st of current month
        } else if (range === 'last_month') {
            startDate.setMonth(startDate.getMonth() - 1);
            startDate.setDate(1);
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0); // Last day of previous month
            endDate.setHours(23, 59, 59, 999);
        } else if (range === 'all_time') {
            startDate = new Date(0); // Epoch
        }

        const chats = await Chat.find({
            conversationId: { $in: conversationIds },
            createdAt: { $gte: startDate, $lte: endDate },
            emotion: { $exists: true, $ne: null }, // Only chats with detected emotions
            sender: 'user' // Focus on user's emotions for mental health analysis
        }).sort({ createdAt: 1 });

        // Process Data
        let positiveCount = 0;
        let negativeCount = 0;
        let totalScore = 0;
        let scoreCount = 0;

        const timeOfDayStats = {
            morning: { total: 0, count: 0 },   // 6-12
            afternoon: { total: 0, count: 0 }, // 12-17
            evening: { total: 0, count: 0 },   // 17-21
            night: { total: 0, count: 0 }      // 21-6
        };

        const dailyEmotions = {}; // Map date string to list of emotions

        chats.forEach(chat => {
            const { score, type } = getEmotionScore(chat.emotion);

            // 1. Overview Counts
            if (type === 'positive') positiveCount++;
            if (type === 'negative') negativeCount++;

            // 2. Score Calculation
            totalScore += score;
            scoreCount++;

            // 3. Time of Day
            const hour = new Date(chat.createdAt).getHours();
            if (hour >= 6 && hour < 12) {
                timeOfDayStats.morning.total += score;
                timeOfDayStats.morning.count++;
            } else if (hour >= 12 && hour < 17) {
                timeOfDayStats.afternoon.total += score;
                timeOfDayStats.afternoon.count++;
            } else if (hour >= 17 && hour < 21) {
                timeOfDayStats.evening.total += score;
                timeOfDayStats.evening.count++;
            } else {
                timeOfDayStats.night.total += score;
                timeOfDayStats.night.count++;
            }

            // 4. Daily Timeline
            const dateStr = new Date(chat.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
            if (!dailyEmotions[dateStr]) dailyEmotions[dateStr] = [];
            dailyEmotions[dateStr].push(score);
        });

        // Calculate Averages for Time of Day
        const trend = {
            morning: timeOfDayStats.morning.count ? Math.round(timeOfDayStats.morning.total / timeOfDayStats.morning.count) : 50,
            afternoon: timeOfDayStats.afternoon.count ? Math.round(timeOfDayStats.afternoon.total / timeOfDayStats.afternoon.count) : 50,
            evening: timeOfDayStats.evening.count ? Math.round(timeOfDayStats.evening.total / timeOfDayStats.evening.count) : 50,
            night: timeOfDayStats.night.count ? Math.round(timeOfDayStats.night.total / timeOfDayStats.night.count) : 50,
        };

        // Calculate Daily Dominant Emotion (Average Score)
        const dailyTimeline = Object.keys(dailyEmotions).map(date => {
            const scores = dailyEmotions[date];
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            let emotionIcon = '😐';
            if (avg >= 80) emotionIcon = '😊';
            else if (avg >= 60) emotionIcon = '😌';
            else if (avg >= 40) emotionIcon = '😔';
            else emotionIcon = '😡';

            return { date, score: avg, icon: emotionIcon };
        }).slice(-7); // Last 7 days

        // Final Mental Health Score
        const finalScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 75; // Default to 75 if no data

        res.json({
            overview: { positive: positiveCount, negative: negativeCount },
            trend,
            dailyTimeline,
            mentalHealthScore: finalScore
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
