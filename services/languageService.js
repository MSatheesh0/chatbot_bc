/**
 * Language Service
 * Handles language detection and related functionality
 */

// In a production environment, you might want to use a proper language detection library
// For now, we'll implement a simple detection based on common patterns

/**
 * Detect language from text
 * @param {string} text - The text to analyze
 * @returns {Promise<string>} - ISO 639-1 language code (e.g., 'en', 'es', 'fr')
 */
async function detectLanguage(text) {
  if (!text || typeof text !== 'string') {
    return 'en'; // Default to English if no text provided
  }

  // Simple language detection based on common words and characters
  // This is a basic implementation - consider using a proper library for production
  
  // Check for Spanish
  if (/\b(el|la|los|las|de|que|y|a|en|un|una|es|por|con|para)\b/i.test(text)) {
    return 'es';
  }
  
  // Check for French
  if (/\b(le|la|les|de|et|à|en|un|une|est|pour|dans|que|qui)\b/i.test(text)) {
    return 'fr';
  }
  
  // Check for German
  if (/\b(der|die|das|und|in|den|von|zu|das|mit|sich|des|auf|für|ist|im|dem|nicht|ein|Die|eine|als|auch|es|an|werden|aus|er|hat|dass|sie|nach|wird|bei|einer|Der|um|haben|nur|sind|auch|noch|wie|ihm|über|einen|Das|so|Sie|zum|war|habe|nur|oder|aber|vor|zur|bis|mehr|durch|man|sein|wurde|wird|ihn|keine|wenn|einer|mich|gegen|vom|schon|wenn|ganz|erst|nachdem|ob|ihr|seine|am|denn|unter|wir|soll|ich|einem|aber|hatte|nun|da|hat|nur|eines|ihn|kann|dem|schon|wieder|ja|dann|mal|ganz|mich|mir|etwas|nichts|viel|vielleicht|warum|diese|dieser|diesem|diesen|dieses|diesen|mein|meine|dein|deine|sein|seine|ihr|ihre|unser|unsere|euer|eure|Ihr|Ihre|man|einen|einem|einer|eines|kein|keine|keinen|keinem|keiner|keines|meinen|meinem|meiner|meines|deinen|deinem|deiner|deines|seinen|seinem|seiner|seines|ihren|ihrem|ihrer|ihres|unseren|unserem|unserer|unseres|euren|eurem|eurer|eures|Ihren|Ihrem|Ihrer|Ihres|manchen|mancher|manches|manchem|mancher|manches|alle|alles|allem|allen|aller|alles|andere|anderer|anderes|andere|anderem|anderen|anderer|anderes|solche|solcher|solches|solchem|solchen|solcher|solches|welche|welcher|welches|welchem|welchen|welcher|welches|dieselbe|dieselben|dieselber|dieselbes|dieselbem|dieselben|dieselber|dieselbes|derjenige|derjenigen|derjeniger|derjeniges|derjenigem|derjenigen|derjeniger|derjeniges|dasselbe|dieselbe|derselben|derselber|dasselbe|demselben|derselben|derselber|derselben|derselben|dasselbe|dieselbe|dieselben|dieselber|dieselbes|dieselbem|dieselben|dieselber|dieselbes|derjenige|derjenigen|derjeniger|derjeniges|derjenigem|derjenigen|derjeniger|derjeniges|dasselbe|dieselbe|derselben|derselber|dasselbe|demselben|derselben|derselber|derselben|derselben|dasselbe)\b/i.test(text)) {
    return 'de';
  }
  
  // Default to English
  return 'en';
}

/**
 * Get language name from ISO code
 * @param {string} code - ISO 639-1 language code
 * @returns {string} - Language name in English
 */
function getLanguageName(code) {
  const languages = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ar: 'Arabic',
    hi: 'Hindi',
    bn: 'Bengali',
    pa: 'Punjabi',
    ta: 'Tamil',
    te: 'Telugu',
    mr: 'Marathi',
    gu: 'Gujarati',
    kn: 'Kannada',
    ml: 'Malayalam',
    or: 'Odia',
    as: 'Assamese',
    sa: 'Sanskrit',
    ne: 'Nepali',
    ur: 'Urdu',
  };
  
  return languages[code] || 'Unknown';
}

/**
 * Check if a language is RTL (Right-to-Left)
 * @param {string} code - ISO 639-1 language code
 * @returns {boolean} - True if the language is RTL
 */
function isRTL(code) {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi'];
  return rtlLanguages.includes(code);
}

module.exports = {
  detectLanguage,
  getLanguageName,
  isRTL
};
