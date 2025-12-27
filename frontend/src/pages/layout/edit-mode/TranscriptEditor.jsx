import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DialogueCard from './DialogueCard.jsx';
import ConfirmationModal from '../../components/ConfirmationModal.jsx';

/**
 * @typedef {object} DialogueBlock
 * @property {number} id - A unique identifier for the block, derived from its line number.
 * @property {string} timestamp - The timestamp string, e.g., "[00:00:00]".
 * @property {string} speaker - The name of the speaker.
 * @property {string} dialogue - The dialogue text spoken by the speaker.
 */

/**
 * A component for displaying and editing a transcript. It parses raw transcript text
 * into individual dialogue blocks, allowing for editing of dialogue and renaming of speakers.
 *
 * @param {object} props - The component props.
 * @param {string} props.content - The raw transcript text content.
 * @param {(newContent: string) => void} props.onContentChange - Callback function triggered when the transcript content is modified.
 * @param {number} props.fontSize - The font size for the transcript text in pixels.
 * @param {number} props.lineHeight - The line height for the transcript text.
 * @param {(timeInSeconds: number) => void} props.onTimestampClick - Callback function triggered when a timestamp is clicked.
 * @param {Array<object>} props.editMatches - Global search matches from the raw content string.
 * @param {number} props.currentEditMatchIndex - The index of the currently active search match.
 * @returns {JSX.Element} The rendered transcript editor component.
 */
const TranscriptEditor = ({ 
  content, 
  onContentChange, 
  fontSize, 
  lineHeight, 
  onTimestampClick,
  editMatches = [],
  currentEditMatchIndex = -1 
}) => {
  const [dialogueBlocks, setDialogueBlocks] = useState([]);
  const blockRefs = useRef([]); // To store refs for scrolling
  
  const [renameModalState, setRenameModalState] = useState({
    show: false,
    oldName: '',
    newName: '',
    index: -1,
    affectedBlocks: [],
  });

  useEffect(() => {
    const parseContent = (text) => {
      if (!text) return [];
      const lines = text.split('\n');
      const blocks = [];
      let currentBlock = null;

      const lineRegex = /^(\[.*?\])\s*(.*?):\s*(.*)/s;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(lineRegex);

        if (match) {
          if (currentBlock) {
            blocks.push(currentBlock);
          }
          currentBlock = {
            id: i,
            timestamp: match[1].trim(),
            speaker: match[2].trim(),
            dialogue: match[3] || '',
          };
        } else {
          if (currentBlock) {
            currentBlock.dialogue += '\n' + line;
          } else {
            currentBlock = { id: i, timestamp: '', speaker: 'NOTE', dialogue: line };
          }
        }
      }
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      return blocks;
    };
    setDialogueBlocks(parseContent(content));
  }, [content]);

  // Calculate global start/end indices for each block to map search results
  const blockRanges = useMemo(() => {
    let runningOffset = 0;
    return dialogueBlocks.map(block => {
      // Reconstruct how this block appears in the raw string (approx logic from ProjectView match)
      // Note: Reconstruct logic matches what is sent to backend/parse
      let blockStr = '';
      if (block.timestamp && block.speaker) {
        blockStr = `${block.timestamp} ${block.speaker}: ${block.dialogue}`;
      } else {
        blockStr = block.dialogue;
      }
      
      const start = runningOffset;
      const end = runningOffset + blockStr.length;
      runningOffset = end + 1; // +1 for newline character
      
      // Calculate header length for offset mapping
      const headerLength = (block.timestamp && block.speaker) 
        ? (block.timestamp.length + 1 + block.speaker.length + 2) // "[ts] spk: "
        : 0;

      return { id: block.id, start, end, headerLength };
    });
  }, [dialogueBlocks]);

  // Handle Scrolling and Highlighting when match index changes
  useEffect(() => {
    if (currentEditMatchIndex === -1 || !editMatches[currentEditMatchIndex]) return;

    const match = editMatches[currentEditMatchIndex];
    const targetBlockIndex = blockRanges.findIndex(range => 
      range.start <= match.startIndex && range.end > match.startIndex
    );
    
    if (targetBlockIndex !== -1) {
      const cardRef = blockRefs.current[targetBlockIndex];
      if (cardRef) {
        // Scroll to the card
        cardRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Find and highlight the matched text within the contentEditable div
        const range = blockRanges[targetBlockIndex];
        const localStart = match.startIndex - range.start;
        const isInDialogue = localStart >= range.headerLength;

        if (isInDialogue) {
          const dialogueOffset = localStart - range.headerLength;
          const matchLength = match.endIndex - match.startIndex;
          
          const editableDiv = cardRef.querySelector('[contenteditable="true"]');
          if (editableDiv) {
            // Remove any existing highlights first
            const existingHighlights = cardRef.querySelectorAll('.search-highlight');
            existingHighlights.forEach(el => {
              const parent = el.parentNode;
              parent.replaceChild(document.createTextNode(el.textContent), el);
              parent.normalize();
            });

            try {
              let charCount = 0;
              let targetNode = null;
              let startInNode = 0;

              const traverse = (node) => {
                if (targetNode) return;
                if (node.nodeType === 3) {
                  const nextCharCount = charCount + node.length;
                  if (!targetNode && dialogueOffset >= charCount && dialogueOffset < nextCharCount) {
                    targetNode = node;
                    startInNode = dialogueOffset - charCount;
                  }
                  charCount = nextCharCount;
                } else {
                  node.childNodes.forEach(traverse);
                }
              };
              traverse(editableDiv);

              if (targetNode) {
                const endInNode = Math.min(startInNode + matchLength, targetNode.length);
                
                // Split the text node and wrap the match in a highlight span
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
              }
            } catch (e) {
              console.warn("Could not highlight text range", e);
            }
          }
        } else {
          // Match is in the header - flash the whole card
          cardRef.style.transition = 'background-color 0.2s';
          cardRef.style.backgroundColor = '#fff3cd';
          setTimeout(() => {
            cardRef.style.backgroundColor = '';
          }, 1000);
        }
      }
    }

    // Cleanup function to remove highlights when match changes
    return () => {
      blockRefs.current.forEach(cardRef => {
        if (cardRef) {
          const existingHighlights = cardRef.querySelectorAll('.search-highlight');
          existingHighlights.forEach(el => {
            const parent = el.parentNode;
            if (parent) {
              parent.replaceChild(document.createTextNode(el.textContent), el);
              parent.normalize();
            }
          });
        }
      });
    };
  }, [currentEditMatchIndex, editMatches, blockRanges]);


  const reconstructContent = useCallback((blocks) => {
    const newContent = blocks.map(block => {
      if (block.timestamp && block.speaker) {
        return `${block.timestamp} ${block.speaker}: ${block.dialogue}`;
      }
      return block.dialogue;
    }).join('\n');
    
    onContentChange(newContent);
  }, [onContentChange]);

  const handleDialogueChange = (index, newDialogue) => {
    const updatedBlocks = [...dialogueBlocks];
    updatedBlocks[index].dialogue = newDialogue;
    setDialogueBlocks(updatedBlocks);
    reconstructContent(updatedBlocks);
  };
  
  const handleInitiateRename = (oldName, newName, index) => {
    const affectedBlocks = dialogueBlocks.filter(b => b.speaker === oldName);
    setRenameModalState({
      show: true,
      oldName,
      newName,
      index,
      affectedBlocks,
    });
  };

  const handleConfirmRename = (isRenameAll) => {
    const { oldName, newName, index } = renameModalState;
  
    if (isRenameAll) {
      const updatedBlocks = dialogueBlocks.map(block =>
        block.speaker === oldName ? { ...block, speaker: newName } : block
      );
      setDialogueBlocks(updatedBlocks);
      reconstructContent(updatedBlocks);
    } else {
      const updatedBlocks = [...dialogueBlocks];
      if (updatedBlocks[index]) {
        updatedBlocks[index].speaker = newName;
        setDialogueBlocks(updatedBlocks);
        reconstructContent(updatedBlocks);
      }
    }
    
    setRenameModalState({ show: false, oldName: '', newName: '', index: -1, affectedBlocks: [] });
  };

  const handleCancelRename = () => {
    setRenameModalState({ show: false, oldName: '', newName: '', index: -1, affectedBlocks: [] });
  };

  const parseTimestamp = (timestampStr) => {
    if (!timestampStr) return null;
    const match = timestampStr.match(/(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return null;
    const hours = parseInt(match[1], 10), minutes = parseInt(match[2], 10), seconds = parseInt(match[3], 10);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
    return hours * 3600 + minutes * 60 + seconds;
  };

  const renderRenamePreview = () => {
    const { oldName, newName, affectedBlocks } = renameModalState;

    return (
      <div>
        <p className="mb-2 text-center text-sm">
          Rename "<strong>{oldName}</strong>" to "<strong>{newName}</strong>"?
        </p>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          This name appears <strong>{affectedBlocks.length}</strong> time{affectedBlocks.length !== 1 ? 's' : ''} in the transcript.
        </p>
      </div>
    );
  };

  return (
    <div style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}>
      {dialogueBlocks.map((block, index) => (
        <DialogueCard
          key={block.id || index}
          ref={el => blockRefs.current[index] = el} // Store Ref
          block={block}
          index={index}
          onDialogueChange={handleDialogueChange}
          onInitiateRename={handleInitiateRename}
          onTimestampClick={() => {
            if (onTimestampClick) {
              const timeInSeconds = parseTimestamp(block.timestamp);
              if (timeInSeconds !== null) onTimestampClick(timeInSeconds);
            }
          }}
        />
      ))}

      <ConfirmationModal
        show={renameModalState.show}
        onClose={handleCancelRename}
        onConfirm={handleConfirmRename}
        title="Confirm Speaker Rename"
        shortMessage={renderRenamePreview()}
        confirmText="Rename"
        showCheckbox={true}
        checkboxLabel="Rename all instances"
        defaultChecked={true}
      />
    </div>
  );
};

export default TranscriptEditor;