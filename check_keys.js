require('dotenv').config();
console.log('Checking Environment Variables...');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Present' : '❌ MISSING (Required)');
console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Present' : '⚠️ Missing (Optional for local test)');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Present' : '❌ MISSING');
