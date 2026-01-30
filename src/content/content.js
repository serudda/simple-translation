/**
 * Content script orchestrator.
 * Coordinates: extractor -> chunker -> service worker -> replacer
 */
(() => {
  let state = {
    status: 'idle', // idle | translating | done | error
    completed: 0,
    total: 0,
    error: null,
    translating: false,
  };

  function broadcastProgress() {
    chrome.runtime.sendMessage({
      type: 'TRANSLATION_PROGRESS',
      status: state.status,
      completed: state.completed,
      total: state.total,
      error: state.error,
    }).catch(() => {
      // Popup may be closed, that's fine
    });
  }

  async function translatePage(targetLang) {
    if (state.translating) {
      return { error: 'Translation already in progress' };
    }

    // Get settings
    const settings = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
        resolve(response?.data || {});
      });
    });

    if (!settings.apiKey) {
      return { error: 'No API key configured. Please set it in Settings.' };
    }

    // Extract text nodes
    const { nodeMap, groups, nodeCount } = PageExtractor.extract();

    if (nodeCount === 0) {
      return { error: 'No translatable text found on this page.' };
    }

    // Warn about large pages
    if (nodeCount > MAX_TEXT_NODES_WARNING) {
      console.warn(
        `[Page Translator] Large page detected: ${nodeCount} text nodes. This may use significant API credits.`,
      );
    }

    // Create chunks
    const chunks = PageChunker.chunk(groups);

    // Update state
    state = {
      status: 'translating',
      completed: 0,
      total: chunks.length,
      error: null,
      translating: true,
    };
    broadcastProgress();

    // Process chunks sequentially
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        // Check cache first
        let translations = await TranslationCache.get(chunk, targetLang);

        if (!translations) {
          // Send to service worker for API call
          const response = await chrome.runtime.sendMessage({
            type: 'TRANSLATE_CHUNK',
            chunk,
            targetLang,
            apiKey: settings.apiKey,
            model: settings.model || 'gpt-4o-mini',
          });

          if (!response.success) {
            throw new Error(response.error);
          }

          translations = response.data;

          // Cache the result
          await TranslationCache.set(chunk, targetLang, translations);
        }

        // Apply translations to DOM
        PageReplacer.applyTranslations(nodeMap, translations);
      } catch (err) {
        console.error(`[Page Translator] Chunk ${i + 1}/${chunks.length} failed:`, err.message);

        // If it's an auth error, stop entirely
        if (err.message?.includes('Invalid API key')) {
          state.status = 'error';
          state.error = err.message;
          state.translating = false;
          broadcastProgress();
          return;
        }
        // Otherwise continue with remaining chunks
      }

      state.completed = i + 1;
      broadcastProgress();
    }

    state.status = 'done';
    state.translating = false;
    broadcastProgress();
  }

  function restoreOriginal() {
    const nodeMap = PageExtractor.getNodeMap();
    const originals = PageExtractor.getOriginals();
    PageReplacer.restoreOriginals(nodeMap, originals);

    state = {
      status: 'idle',
      completed: 0,
      total: 0,
      error: null,
      translating: false,
    };
    broadcastProgress();
  }

  // Warn user before leaving during translation
  window.addEventListener('beforeunload', (e) => {
    if (state.translating) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Listen for messages from popup and service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_TRANSLATION') {
      translatePage(message.targetLang).then((result) => {
        if (result?.error) {
          sendResponse({ error: result.error });
        } else {
          sendResponse({ success: true });
        }
      });
      return true; // async response
    }

    if (message.type === 'RESTORE_ORIGINAL') {
      restoreOriginal();
      sendResponse({ success: true });
    }

    if (message.type === 'GET_STATUS') {
      sendResponse({
        status: state.status,
        completed: state.completed,
        total: state.total,
        error: state.error,
      });
    }
  });
})();
