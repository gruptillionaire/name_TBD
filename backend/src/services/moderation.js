const leoProfanity = require('leo-profanity');

// Load default dictionary
leoProfanity.loadDictionary();

const moderateContent = (text) => {
  if (!text || typeof text !== 'string') {
    return { isClean: false, cleanedText: '', containsProfanity: false };
  }

  const containsProfanity = leoProfanity.check(text);
  const cleanedText = leoProfanity.clean(text);

  return {
    isClean: !containsProfanity,
    cleanedText,
    containsProfanity
  };
};

const isProfane = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  return leoProfanity.check(text);
};

module.exports = { moderateContent, isProfane };
