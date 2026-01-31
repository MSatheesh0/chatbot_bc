const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

// Initialize AI models
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

// Emotion and action analysis using Google's Generative AI
async function analyzeEmotionAndAction({ text, audioData, context = '', language = 'en' }) {
  try {
    const prompt = `Analyze the following user input and determine the appropriate emotion and action. 
    Input: ${text || '[Audio input]'}
    Context: ${context}
    
    Return a JSON object with the following structure:
    {
      "emotion": "calm | sad | anxious | angry | stressed | panic | neutral",
      "action": "no_action | breathing | suggest_doctor | emergency_check | open_doctor",
      "reasoning": "Brief explanation of your analysis"
    }`;

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = JSON.parse(response.text());

    // Validate the response
    const validEmotions = ['calm', 'sad', 'anxious', 'angry', 'stressed', 'panic', 'neutral'];
    const validActions = ['no_action', 'breathing', 'suggest_doctor', 'emergency_check', 'open_doctor'];
    
    if (!validEmotions.includes(analysis.emotion) || !validActions.includes(analysis.action)) {
      throw new Error('Invalid emotion or action from AI');
    }

    return {
      emotion: analysis.emotion,
      action: analysis.action,
      reasoning: analysis.reasoning
    };
  } catch (error) {
    console.error('Error in emotion analysis:', error);
    // Fallback to neutral state
    return {
      emotion: 'neutral',
      action: 'no_action',
      reasoning: 'Error in analysis, defaulting to neutral'
    };
  }
}

// Language detection using Groq
async function detectLanguage(text) {
  if (!text) return 'en'; // Default to English if no text provided
  
  try {
    const response = await groqClient.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a language detection system. Only respond with the ISO 639-1 language code.'
        },
        {
          role: 'user',
          content: `Detect the language of this text and respond with only the ISO 639-1 language code: ${text}`
        }
      ],
      model: 'mixtral-8x7b-32768',
      temperature: 0.1,
      max_tokens: 5
    });
    
    const detectedLanguage = response.choices[0]?.message?.content?.trim().toLowerCase() || 'en';
    return detectedLanguage;
  } catch (error) {
    console.error('Error detecting language:', error);
    return 'en'; // Default to English on error
  }
}

// Generate appropriate response based on emotion and action
async function generateResponse(emotion, action, language = 'en') {
  const responses = {
    calm: {
      en: 'I\'m here for you. How can I help?',
      es: 'Estoy aquí para ti. ¿En qué puedo ayudarte?',
      fr: 'Je suis là pour toi. Comment puis-je t\'aider ?',
      // Add more languages as needed
    },
    sad: {
      en: 'I hear that you\'re feeling down. Would you like to talk about it?',
      es: 'Escucho que te sientes triste. ¿Te gustaría hablar de eso?',
      fr: 'Je vois que tu te sens triste. Veux-tu en parler ?',
    },
    // Add more emotions as needed
  };

  // Get the appropriate response based on emotion and language
  let response = responses[emotion]?.[language] || responses[emotion]?.en || 'I\'m here to help.';

  // Add action-specific response
  if (action === 'suggest_doctor') {
    const doctorResponses = {
      en: 'Would you like me to help you find a doctor to talk to?',
      es: '¿Te gustaría que te ayude a encontrar un médico con quien hablar?',
      fr: 'Souhaites-tu que je t\'aide à trouver un médecin à qui parler ?',
    };
    response += ' ' + (doctorResponses[language] || doctorResponses.en);
  } else if (action === 'breathing') {
    const breathingResponses = {
      en: 'Let\'s do a quick breathing exercise together.',
      es: 'Hagamos un ejercicio de respiración juntos.',
      fr: 'Faisons un exercice de respiration ensemble.',
    };
    response = (breathingResponses[language] || breathingResponses.en) + ' ' + response;
  }

  return response;
}

module.exports = {
  analyzeEmotionAndAction,
  detectLanguage,
  generateResponse
};
