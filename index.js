require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
// Webhook requires raw body, so we must mount it before express.json()
app.use('/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// MongoDB Connection
// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000, // Increase timeout to 30s
    socketTimeoutMS: 45000,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/chat', require('./routes/chat'));
app.use('/avatars', require('./routes/avatar'));
app.use('/reminders', require('./routes/reminder'));
app.use('/doctors', require('./routes/doctor'));
// app.use('/appointments', require('./routes/appointment')); // Removed duplicate/old route
app.use('/bookings', require('./routes/booking'));
app.use('/payments', require('./routes/payment'));
app.use('/chatbot', require('./routes/doctorChatbot'));
app.use('/appointments', require('./routes/appointments'));
app.use('/rpm', require('./routes/rpm'));
app.use('/analysis', require('./routes/analysis'));
app.use('/voice', require('./routes/voice'));
app.use('/settings', require('./routes/settings'));
app.use('/support', require('./routes/support'));
app.use('/consent', require('./routes/consent'));
app.use('/notifications', require('./routes/notification'));

// Reminder Scheduler
const cron = require('node-cron');
const Reminder = require('./models/Reminder');
const Notification = require('./models/Notification');
const Chat = require('./models/Chat');
const Conversation = require('./models/Conversation');

cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();

        // --- GENERIC REMINDERS ---
        const dueReminders = await Reminder.find({
            time: { $lte: now },
            isTriggered: false
        });

        for (const reminder of dueReminders) {
            // Find or create a 'System' conversation for the user
            let conversation = await Conversation.findOne({
                participants: reminder.userId,
                title: 'System'
            });

            if (!conversation) {
                conversation = new Conversation({
                    participants: [reminder.userId],
                    title: 'System'
                });
                await conversation.save();
            }

            // Create a chat message from the avatar (system)
            const systemChat = new Chat({
                conversationId: conversation._id,
                sender: conversation._id, // System/AI sender
                message: `Reminder: ${reminder.message}`,
                action: reminder.action,
                emotion: 'excited',
                type: 'system'
            });
            await systemChat.save();

            // Mark reminder as triggered
            reminder.isTriggered = true;
            await reminder.save();

            console.log(`Triggered reminder for user ${reminder.userId}: ${reminder.message}`);
        }

        // --- APPOINTMENT NOTIFICATIONS ---
        const dueNotifications = await Notification.find({
            scheduledTime: { $lte: now },
            sentStatus: 'pending'
        });

        for (const notif of dueNotifications) {
            notif.sentStatus = 'sent';
            await notif.save();
            console.log(`Marked appointment notification as sent for user ${notif.userId}: ${notif.reminderType}`);
            // In a real app with FCM, we would send the push notification here.
        }

    } catch (err) {
        console.error('Error in scheduler:', err);
    }
});

// Basic Route
app.get('/', (req, res) => {
    res.send('Chatbot API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Groq API Key loaded: ${process.env.GROQ_API_KEY ? 'YES' : 'NO'}`);

});
