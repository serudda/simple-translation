/**
 * Extracts visible text nodes from the DOM, assigns IDs,
 * and groups them by their nearest block-level ancestor.
 */
const PageExtractor = (() => {
  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT',
    'EMBED', 'SVG', 'CANVAS', 'TEMPLATE', 'CODE', 'PRE',
    'TEXTAREA', 'INPUT', 'SELECT',
  ]);

  const BLOCK_TAGS = new Set([
    'DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'ARTICLE', 'SECTION', 'BLOCKQUOTE', 'FIGURE', 'FIGCAPTION',
    'HEADER', 'FOOTER', 'NAV', 'MAIN', 'ASIDE', 'DD', 'DT',
    'TABLE', 'TR', 'TD', 'TH', 'CAPTION', 'DETAILS', 'SUMMARY',
  ]);

  // WeakMap: textNode -> original text
  const originals = new WeakMap();
  // Map: id -> textNode
  let nodeMap = new Map();

  function isVisible(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
    const style = getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  function shouldSkip(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable) return true;
    if (el.getAttribute('translate') === 'no') return true;
    return false;
  }

  function getBlockAncestor(node) {
    let el = node.parentElement;
    while (el && el !== document.body) {
      if (BLOCK_TAGS.has(el.tagName)) return el;
      el = el.parentElement;
    }
    return document.body;
  }

  /**
   * Walk the DOM and extract text nodes.
   * Returns { nodeMap, groups, nodeCount }
   *   nodeMap: Map<id, textNode>
   *   groups: Array<{ ancestor: Element, items: Array<{id, text}> }>
   *   nodeCount: total text nodes found
   */
  function extract() {
    nodeMap = new Map();
    let id = 0;
    const groupMap = new Map(); // ancestor -> [{id, text}]

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (shouldSkip(parent)) return NodeFilter.FILTER_REJECT;
          if (!isVisible(parent)) return NodeFilter.FILTER_REJECT;

          const text = node.textContent.trim();
          if (text.length < 2) return NodeFilter.FILTER_REJECT;

          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    while (walker.nextNode()) {
      const textNode = walker.currentNode;
      const text = textNode.textContent;
      const nodeId = id++;

      nodeMap.set(nodeId, textNode);
      originals.set(textNode, text);

      const ancestor = getBlockAncestor(textNode);
      if (!groupMap.has(ancestor)) {
        groupMap.set(ancestor, []);
      }
      groupMap.get(ancestor).push({ id: nodeId, text });
    }

    const groups = [];
    for (const [ancestor, items] of groupMap) {
      groups.push({ ancestor, items });
    }

    return { nodeMap, groups, nodeCount: id };
  }

  function getNodeMap() {
    return nodeMap;
  }

  function getOriginals() {
    return originals;
  }

  return { extract, getNodeMap, getOriginals };
})();
