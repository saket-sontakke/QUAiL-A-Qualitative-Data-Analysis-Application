import React, { useState, useEffect, useCallback } from 'react';
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
 * @param {(timeInSeconds: number) => void} props.onTimestampClick - Callback function triggered when a timestamp is clicked, passing the time in seconds.
 * @returns {JSX.Element} The rendered transcript editor component.
 */
const TranscriptEditor = ({ content, onContentChange, fontSize, lineHeight, onTimestampClick }) => {
  const [dialogueBlocks, setDialogueBlocks] = useState([]);
  const [renameModalState, setRenameModalState] = useState({
    show: false,
    oldName: '',
    newName: '',
    index: -1,
    affectedBlocks: [],
  });

  /**
   * Effect to parse the raw transcript `content` string into an array of structured
   * `DialogueBlock` objects whenever the `content` prop changes.
   */
  useEffect(() => {
    /**
     * Parses a raw text string into an array of DialogueBlock objects.
     * Each block corresponds to a speaker's line or a note.
     * @param {string} text - The raw transcript content.
     * @returns {DialogueBlock[]} An array of parsed dialogue blocks.
     */
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

  /**
   * Reconstructs the raw transcript string from the array of dialogue blocks
   * and calls the onContentChange callback to update the parent component's state.
   * Wrapped in useCallback for optimization.
   * @param {DialogueBlock[]} blocks - The array of dialogue blocks to reconstruct from.
   */
  const reconstructContent = useCallback((blocks) => {
    const newContent = blocks.map(block => {
      if (block.timestamp && block.speaker) {
        return `${block.timestamp} ${block.speaker}: ${block.dialogue}`;
      }
      return block.dialogue;
    }).join('\n');
    
    onContentChange(newContent);
  }, [onContentChange]);

  /**
   * Handles changes to the dialogue text of a specific block.
   * @param {number} index - The index of the dialogue block being updated.
   * @param {string} newDialogue - The new dialogue text.
   */
  const handleDialogueChange = (index, newDialogue) => {
    const updatedBlocks = [...dialogueBlocks];
    updatedBlocks[index].dialogue = newDialogue;
    setDialogueBlocks(updatedBlocks);
    reconstructContent(updatedBlocks);
  };
  
  /**
   * Initiates the speaker renaming process by opening a confirmation modal.
   * @param {string} oldName - The current speaker name.
   * @param {string} newName - The proposed new speaker name.
   * @param {number} index - The index of the block where the rename was initiated.
   */
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

  /**
   * Confirms and applies the speaker rename operation based on user choice in the modal.
   * It can rename either a single instance or all instances of a speaker's name.
   * @param {boolean} isRenameAll - True if all instances should be renamed, false otherwise.
   */
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

  /**
   * Cancels the rename operation and closes the confirmation modal.
   */
  const handleCancelRename = () => {
    setRenameModalState({ show: false, oldName: '', newName: '', index: -1, affectedBlocks: [] });
  };

  /**
   * Parses a timestamp string (e.g., "[HH:MM:SS]") into a total number of seconds.
   * @param {string} timestampStr - The timestamp string to parse.
   * @returns {number|null} The total time in seconds, or null if parsing fails.
   */
  const parseTimestamp = (timestampStr) => {
    if (!timestampStr) return null;
    const match = timestampStr.match(/(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return null;
    const hours = parseInt(match[1], 10), minutes = parseInt(match[2], 10), seconds = parseInt(match[3], 10);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
    return hours * 3600 + minutes * 60 + seconds;
  };

  /**
   * Renders the preview content for the rename confirmation modal.
   * @returns {JSX.Element} The JSX to be displayed inside the modal.
   */
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