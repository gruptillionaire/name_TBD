const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL;

const translate = async (text, targetLang, sourceLang = 'auto') => {
  if (!text || text.trim() === '') {
    return text;
  }

  try {
    // Using MyMemory free API
    let url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;

    if (MYMEMORY_EMAIL) {
      url += `&de=${encodeURIComponent(MYMEMORY_EMAIL)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData) {
      return data.responseData.translatedText;
    }

    console.error('Translation API error:', data);
    return text;
  } catch (error) {
    console.error('Error translating text:', error);
    return text;
  }
};

const detectLanguage = async (text) => {
  try {
    // Simple detection using MyMemory by translating to English
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 100))}&langpair=auto|en`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.responseData && data.responseData.detectedLanguage) {
      return data.responseData.detectedLanguage;
    }

    return null;
  } catch (error) {
    console.error('Error detecting language:', error);
    return null;
  }
};

module.exports = { translate, detectLanguage };
