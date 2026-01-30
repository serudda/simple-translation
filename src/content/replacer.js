/**
 * Replaces text nodes in the DOM with translated text.
 * Can restore originals using the WeakMap from the extractor.
 */
const PageReplacer = (() => {
  /**
   * Replace text nodes with translations.
   * @param {Map<number, Node>} nodeMap - ID to text node mapping
   * @param {Array<{id: number, text: string}>} translations - translated items
   */
  function applyTranslations(nodeMap, translations) {
    for (const { id, text } of translations) {
      const node = nodeMap.get(id);
      if (node && text) {
        node.textContent = text;
      }
    }
  }

  /**
   * Restore all text nodes to their original content.
   * @param {Map<number, Node>} nodeMap
   * @param {WeakMap<Node, string>} originals
   */
  function restoreOriginals(nodeMap, originals) {
    for (const [, node] of nodeMap) {
      const original = originals.get(node);
      if (original !== undefined) {
        node.textContent = original;
      }
    }
  }

  return { applyTranslations, restoreOriginals };
})();
