/**
 * Service Worker - Acts as a proxy for OpenAI API calls.
 * Content scripts cannot call external APIs directly due to CSP,
 * so they send messages here to be forwarded to OpenAI.
 */

importScripts('../lib/constants.js', '../lib/openai-client.js');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRANSLATE_CHUNK') {
    handleTranslateChunk(message)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      sendResponse({ success: true, data: settings });
    });
    return true;
  }
});

async function handleTranslateChunk({ chunk, targetLang, apiKey, model }) {
  if (!apiKey) {
    throw new Error('No API key configured. Please set it in the extension settings.');
  }

  const langEntry = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);
  const langName = langEntry ? langEntry.name : targetLang;

  return await translateChunk(chunk, langName, apiKey, model);
}
