/**
 * Splits extracted text groups into chunks that fit within
 * the token limit for API calls.
 */
const PageChunker = (() => {
  function estimateTokens(text) {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  function itemsCharCount(items) {
    return items.reduce((sum, item) => sum + item.text.length, 0);
  }

  /**
   * Split a single group's items by sentence boundaries
   * when the group exceeds MAX_CHUNK_CHARS.
   */
  function splitLargeGroup(items) {
    const subGroups = [];
    let current = [];
    let currentLen = 0;

    for (const item of items) {
      if (item.text.length > MAX_CHUNK_CHARS) {
        // Split by sentences
        const sentences = item.text.match(/[^.!?]+[.!?]+\s*/g) || [item.text];
        for (const sentence of sentences) {
          const trimmed = sentence.trim();
          if (!trimmed) continue;
          if (currentLen + trimmed.length > MAX_CHUNK_CHARS && current.length > 0) {
            subGroups.push(current);
            current = [];
            currentLen = 0;
          }
          current.push({ id: item.id, text: trimmed });
          currentLen += trimmed.length;
        }
      } else if (currentLen + item.text.length > MAX_CHUNK_CHARS && current.length > 0) {
        subGroups.push(current);
        current = [item];
        currentLen = item.text.length;
      } else {
        current.push(item);
        currentLen += item.text.length;
      }
    }

    if (current.length > 0) {
      subGroups.push(current);
    }

    return subGroups;
  }

  /**
   * Takes groups from the extractor and packs them into chunks
   * of approximately TOKEN_LIMIT tokens each.
   *
   * @param {Array<{ancestor, items}>} groups
   * @returns {Array<Array<{id, text}>>} chunks
   */
  function chunk(groups) {
    const chunks = [];
    let currentChunk = [];
    let currentChars = 0;

    for (const group of groups) {
      const groupChars = itemsCharCount(group.items);

      // If a single group exceeds the limit, split it
      if (groupChars > MAX_CHUNK_CHARS) {
        // Flush current chunk first
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentChars = 0;
        }
        const subGroups = splitLargeGroup(group.items);
        for (const sub of subGroups) {
          chunks.push(sub);
        }
        continue;
      }

      // If adding this group would exceed the limit, start a new chunk
      if (currentChars + groupChars > MAX_CHUNK_CHARS && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentChars = 0;
      }

      currentChunk.push(...group.items);
      currentChars += groupChars;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  return { chunk };
})();
