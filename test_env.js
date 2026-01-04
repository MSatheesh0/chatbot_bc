require('dotenv').config();
console.log('Current Directory:', process.cwd());
console.log('ELEVEN_LABS_API_KEY:', process.env.ELEVEN_LABS_API_KEY ? 'LOADED' : 'NOT LOADED');
if (process.env.ELEVEN_LABS_API_KEY) {
    console.log('Key Length:', process.env.ELEVEN_LABS_API_KEY.length);
    console.log('First 5 chars:', process.env.ELEVEN_LABS_API_KEY.substring(0, 5));
}
const fs = require('fs');
try {
    const envFile = fs.readFileSync('.env', 'utf8');
    console.log('.env file found. Content length:', envFile.length);
    const lines = envFile.split('\n');
    lines.forEach((line, index) => {
        if (line.includes('ELEVEN_LABS_API_KEY')) {
            console.log(`Line ${index + 1}: ${line.substring(0, 25)}...`);
        }
    });
} catch (e) {
    console.log('Error reading .env:', e.message);
}
