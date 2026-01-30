/**
 * IndexedDB-based translation cache.
 * Keys are SHA-256 hashes of (text + targetLang).
 */
const TranslationCache = (() => {
  let db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) {
        resolve(db);
        return;
      }

      const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(CACHE_STORE_NAME)) {
          database.createObjectStore(CACHE_STORE_NAME, { keyPath: 'hash' });
        }
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };

      request.onerror = (event) => {
        reject(new Error('Failed to open cache database: ' + event.target.error));
      };
    });
  }

  async function computeHash(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function buildCacheKey(chunkItems, targetLang) {
    const text = chunkItems.map((item) => item.text).join('|||');
    return computeHash(text + '::' + targetLang);
  }

  /**
   * Look up a chunk in the cache.
   * @param {Array<{id, text}>} chunkItems
   * @param {string} targetLang
   * @returns {Promise<Array<{id, text}>|null>} cached translations or null
   */
  async function get(chunkItems, targetLang) {
    try {
      const database = await openDB();
      const hash = await buildCacheKey(chunkItems, targetLang);

      return new Promise((resolve) => {
        const tx = database.transaction(CACHE_STORE_NAME, 'readonly');
        const store = tx.objectStore(CACHE_STORE_NAME);
        const request = store.get(hash);

        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            // Re-map cached translations to current node IDs
            const idMapping = chunkItems.map((item, i) => ({
              id: item.id,
              text: result.translations[i]?.text || item.text,
            }));
            resolve(idMapping);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Store translations in the cache.
   * @param {Array<{id, text}>} chunkItems - original chunk items
   * @param {string} targetLang
   * @param {Array<{id, text}>} translations - translated items
   */
  async function set(chunkItems, targetLang, translations) {
    try {
      const database = await openDB();
      const hash = await buildCacheKey(chunkItems, targetLang);

      const tx = database.transaction(CACHE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CACHE_STORE_NAME);
      store.put({
        hash,
        translations,
        targetLang,
        timestamp: Date.now(),
      });
    } catch {
      // Cache write failures are non-critical
    }
  }

  return { get, set };
})();
