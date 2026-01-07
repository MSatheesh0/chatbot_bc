require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('./models/Payment');

async function checkLastPayment() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const lastPayment = await Payment.findOne().sort({ createdAt: -1 });

        if (!lastPayment) {
            console.log('No payments found in the database.');
        } else {
            console.log('\n--- LATEST PAYMENT STATUS ---');
            console.log(`Payment ID: ${lastPayment.paymentIntentId}`);
            console.log(`Amount: ₹${lastPayment.amount / 100}`);
            console.log(`Status: ${lastPayment.status.toUpperCase()}`);
            console.log(`Date: ${lastPayment.createdAt}`);
            console.log(`User ID: ${lastPayment.userId}`);
            console.log('-----------------------------\n');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

checkLastPayment();
