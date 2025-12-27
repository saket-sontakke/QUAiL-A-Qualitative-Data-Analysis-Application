/**
 * DOM utility functions for working with text selections and ranges
 * in the project viewer.
 */

/**
 * Calculates the character offset of a node within a container element.
 * This is used to determine the start and end indices of a text selection.
 * @param {HTMLElement} container - The parent element containing the text nodes.
 * @param {Node} node - The specific text node to find the offset of.
 * @param {number} offset - The character offset within the `node`.
 * @returns {number} The total character offset from the beginning of the container, or -1 if not found.
 */
export const getCharOffset = (container, node, offset) => {
  let charCount = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    if (currentNode === node) {
      return charCount + offset;
    }
    charCount += currentNode.length;
  }
  return -1;
};

/**
 * Creates a DOM Range object from character start and end indices within a container element.
 * This is used to programmatically highlight text based on stored annotation data.
 * @param {HTMLElement} containerElement - The element that contains the text.
 * @param {number} startIndex - The starting character index of the range.
 * @param {number} endIndex - The ending character index of the range.
 * @returns {Range|null} A DOM Range object, or null if the range cannot be created.
 */
export const createRangeFromOffsets = (containerElement, startIndex, endIndex) => {
  const range = document.createRange();
  const findNodeAndOffset = (targetIndex) => {
    const treeWalker = document.createTreeWalker(containerElement, NodeFilter.SHOW_TEXT, null, false);
    let node;
    let charCount = 0;
    while ((node = treeWalker.nextNode())) {
      const nodeLength = node.nodeValue.length;
      if (charCount + nodeLength >= targetIndex) {
        return { node, offset: targetIndex - charCount };
      }
      charCount += nodeLength;
    }
    return { node: null, offset: -1 };
  };
  const startInfo = findNodeAndOffset(startIndex);
  const endInfo = findNodeAndOffset(endIndex);
  if (startInfo.node && endInfo.node) {
    range.setStart(startInfo.node, startInfo.offset);
    range.setEnd(endInfo.node, endInfo.offset);
    return range;
  }
  return null;
};

/**
 * Calculates the optimal position for a floating UI element based on
 * a text selection, ensuring it stays within the viewport.
 * @param {DOMRect[]} rects - The client rects of the selected range.
 * @param {number} panelWidth - The width of the floating panel.
 * @param {number} panelHeight - The height of the floating panel.
 * @param {number} [margin=10] - The minimum margin from viewport edges.
 * @returns {{top: number, left: number}} The calculated position.
 */
export const calculateFloatingPosition = (rects, panelWidth, panelHeight, margin = 10) => {
  if (rects.length === 0) return { top: 0, left: 0 };
  
  const firstRect = rects[0];
  const lastRect = rects[rects.length - 1];
  
  let desiredTop = lastRect.bottom + window.scrollY + 8;
  let desiredLeft = lastRect.right + window.scrollX;
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Adjust horizontal position if panel would overflow
  if (desiredLeft + panelWidth > viewportWidth - margin) {
    desiredLeft = lastRect.right + window.scrollX - panelWidth;
  }
  
  // Adjust vertical position if panel would overflow
  if (desiredTop + panelHeight > viewportHeight - margin) {
    desiredTop = firstRect.top + window.scrollY - panelHeight - 8;
  }
  
  // Ensure panel stays within viewport bounds
  if (desiredTop < window.scrollY + margin) {
    desiredTop = window.scrollY + margin;
  }
  
  if (desiredLeft < window.scrollX + margin) {
    desiredLeft = window.scrollX + margin;
  }
  
  return { top: desiredTop, left: desiredLeft };
};

/**
 * Expands a DOM Range to ensure it captures full words at the boundaries.
 * @param {Range} range - The current user selection range
 * @returns {Range} - A new range snapped to word boundaries
 */
export const snapRangeToWord = (range) => {
  const newRange = range.cloneRange();
  
  // 1. Define what constitutes a word and what constitutes sentence endings
  const isWordChar = (char) => /[\w'-]/.test(char);
  // Includes period, question mark, exclamation point. 
  // You can add others like ';' or ':' here if desired.
  const isSentenceEnd = (char) => /[.?!]/.test(char);

  // 2. Expand Start Backwards
  let startNode = newRange.startContainer;
  let startOffset = newRange.startOffset;

  if (startNode.nodeType === Node.TEXT_NODE) {
    const text = startNode.textContent;
    // Walk backwards while we are still inside a word
    while (startOffset > 0 && isWordChar(text[startOffset - 1])) {
      startOffset--;
    }
    newRange.setStart(startNode, startOffset);
  }

  // 3. Expand End Forwards
  let endNode = newRange.endContainer;
  let endOffset = newRange.endOffset;

  if (endNode.nodeType === Node.TEXT_NODE) {
    const text = endNode.textContent;
    
    // A. Walk forwards through the word characters
    while (endOffset < text.length && isWordChar(text[endOffset])) {
      endOffset++;
    }

    // B. Walk forwards through any trailing sentence-ending punctuation
    // Using a 'while' loop here catches things like "Wow!!!" or "Really?!" or "..."
    while (endOffset < text.length && isSentenceEnd(text[endOffset])) {
      endOffset++;
    }

    newRange.setEnd(endNode, endOffset);
  }

  return newRange;
};