import React, { useEffect, useRef, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';

/**
 * A text editor component that supports search highlighting
 * Used for plain text file editing in edit mode
 */
const TextEditor = ({ 
  content, 
  onContentChange, 
  fontSize, 
  lineHeight,
  editMatches = [],
  currentEditMatchIndex = -1,
  onTimestampClick,
  hasAudio
}) => {
  const editorRef = useRef(null);
  const [isContentLoaded, setIsContentLoaded] = useState(false);

  // NOTE: I removed the first duplicate useEffect from here. 
  // We handle initialization AND updates in the single useEffect below.

  // Handle content updates
  const handleInput = (e) => {
    onContentChange(e.currentTarget.textContent || '');
  };

  // Handle clicks for timestamp seeking (if audio)
  const handleClick = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    if (!hasAudio || !onTimestampClick) return;
    
    e.preventDefault();
    
    const editor = e.currentTarget;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editor);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const cursorPosition = preCaretRange.toString().length;
    
    const text = editor.textContent || '';
    const lineStartIndex = text.lastIndexOf('\n', cursorPosition - 1) + 1;
    let lineEndIndex = text.indexOf('\n', cursorPosition);
    if (lineEndIndex === -1) lineEndIndex = text.length;
    
    const currentLine = text.substring(lineStartIndex, lineEndIndex);
    const timestampRegex = /\[(\d{2}):(\d{2}):(\d{2})\]/;
    const match = currentLine.match(timestampRegex);
    
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      const timeInSeconds = hours * 3600 + minutes * 60 + seconds;
      onTimestampClick(timeInSeconds);
    }
  };

  // Handle search highlighting
  useEffect(() => {
    if (!editorRef.current || currentEditMatchIndex === -1 || !editMatches[currentEditMatchIndex]) {
      if (editorRef.current) {
        const highlights = editorRef.current.querySelectorAll('.search-highlight');
        highlights.forEach(el => {
          const parent = el.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
          }
        });
      }
      return;
    }

    const match = editMatches[currentEditMatchIndex];
    const editor = editorRef.current;
    
    const existingHighlights = editor.querySelectorAll('.search-highlight');
    existingHighlights.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
      }
    });

    try {
      let charCount = 0;
      let targetNode = null;
      let startInNode = 0;

      const traverse = (node) => {
        if (targetNode) return;
        if (node.nodeType === 3) {
          const nextCharCount = charCount + node.length;
          if (match.startIndex >= charCount && match.startIndex < nextCharCount) {
            targetNode = node;
            startInNode = match.startIndex - charCount;
          }
          charCount = nextCharCount;
        } else {
          Array.from(node.childNodes).forEach(traverse);
        }
      };
      
      traverse(editor);

      if (targetNode) {
        const matchLength = match.endIndex - match.startIndex;
        const endInNode = Math.min(startInNode + matchLength, targetNode.length);
        
        const beforeText = targetNode.textContent.substring(0, startInNode);
        const matchText = targetNode.textContent.substring(startInNode, endInNode);
        const afterText = targetNode.textContent.substring(endInNode);

        const fragment = document.createDocumentFragment();
        if (beforeText) fragment.appendChild(document.createTextNode(beforeText));
        
        const highlight = document.createElement('span');
        highlight.className = 'search-highlight';
        highlight.style.backgroundColor = '#FFFF00';
        highlight.style.padding = '2px 0';
        highlight.textContent = matchText;
        fragment.appendChild(highlight);
        
        if (afterText) fragment.appendChild(document.createTextNode(afterText));

        targetNode.parentNode.replaceChild(fragment, targetNode);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const highlightEl = editor.querySelector('.search-highlight');
            if (highlightEl) {
              highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          });
        });
      }
    } catch (e) {
      console.warn("Could not highlight text:", e);
    }

    return () => {
      if (editorRef.current) {
        const highlights = editorRef.current.querySelectorAll('.search-highlight');
        highlights.forEach(el => {
          const parent = el.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
          }
        });
      }
    };
  }, [currentEditMatchIndex, editMatches]);

  // Update content when prop changes (Consolidated Effect)
  useEffect(() => {
    if (editorRef.current) {
        
      // --- FIX: Ensure blank screen is removed ---
      if (!isContentLoaded) {
        setIsContentLoaded(true);
      }
      // -------------------------------------------

      if (editorRef.current.textContent !== content) {
        const selection = window.getSelection();
        let cursorPos = 0;
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const preCaretRange = range.cloneRange();
          preCaretRange.selectNodeContents(editorRef.current);
          preCaretRange.setEnd(range.endContainer, range.endOffset);
          cursorPos = preCaretRange.toString().length;
        }

        editorRef.current.textContent = content;

        if (cursorPos > 0) {
          try {
            const range = document.createRange();
            const sel = window.getSelection();
            let charCount = 0;
            let found = false;

            const traverse = (node) => {
              if (found) return;
              if (node.nodeType === 3) {
                const nextCharCount = charCount + node.length;
                if (cursorPos >= charCount && cursorPos <= nextCharCount) {
                  range.setStart(node, Math.min(cursorPos - charCount, node.length));
                  range.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(range);
                  found = true;
                }
                charCount = nextCharCount;
              } else {
                Array.from(node.childNodes).forEach(traverse);
              }
            };
            
            traverse(editorRef.current);
          } catch (e) {
            console.warn("Could not restore cursor position:", e);
          }
        }
      }
    }
  }, [content]); // Removed isContentLoaded from dependency to prevent re-runs

  return (
    <div className="relative h-full w-full overflow-hidden">
      {!isContentLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 z-10">
          <FaSpinner className="animate-spin text-4xl text-[#F05623]" />
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={handleClick}
        className="h-full w-full overflow-auto bg-transparent p-10 text-black focus:outline-none custom-scrollbar dark:text-gray-200 whitespace-pre-wrap"
        style={{ 
          fontSize: `${fontSize}px`, 
          lineHeight: lineHeight,
          opacity: isContentLoaded ? 1 : 0 
        }}
        title={hasAudio ? "Ctrl+Click (or ⌘+Click) on a line to seek audio" : ""}
      >
      </div>
    </div>
  );
};

export default TextEditor;