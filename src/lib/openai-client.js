/**
 * OpenAI API wrapper for translation.
 * Used by the service worker (background script).
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function buildSystemPrompt(targetLang) {
  return `You are a professional translator. You will receive a JSON array of objects with "id" and "text" fields. Translate each "text" value to ${targetLang}. Preserve the exact same "id" values. Return a JSON object with a "translations" key containing the array of translated objects in the same format: [{"id": <number>, "text": "<translated text>"}]. Only translate the text, do not add explanations. Keep proper nouns, brand names, URLs, and code snippets unchanged.`;
}

async function translateChunk(chunk, targetLang, apiKey, model) {
  const payload = chunk.map((item) => ({ id: item.id, text: item.text }));

  const body = {
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt(targetLang) },
      { role: 'user', content: JSON.stringify(payload) },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  };

  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 429) {
        // Rate limited - wait with exponential backoff
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your settings.');
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          `API error (${response.status}): ${errData.error?.message || 'Unknown error'}`,
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from API');
      }

      const parsed = JSON.parse(content);
      const translations = parsed.translations || parsed;

      if (!Array.isArray(translations)) {
        throw new Error('Invalid response format: expected array of translations');
      }

      return translations;
    } catch (err) {
      lastError = err;

      if (err.name === 'AbortError') {
        lastError = new Error('Request timed out');
      }

      // Don't retry on auth errors
      if (err.message?.includes('Invalid API key')) {
        throw err;
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error('Translation failed after retries');
}
