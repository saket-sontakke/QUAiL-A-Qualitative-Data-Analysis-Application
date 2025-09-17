import React, { useState, useEffect, useRef } from 'react';
import { FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

/**
 * @typedef {import('./TranscriptEditor.jsx').DialogueBlock} DialogueBlock
 */

/**
 * A card component that displays a single block of a transcript, including the
 * timestamp, speaker, and dialogue. It provides functionality for in-place
 * editing of the speaker's name and dialogue text.
 *
 * @param {object} props - The component props.
 * @param {DialogueBlock} props.block - The dialogue block data to display.
 * @param {number} props.index - The index of this block within the parent transcript array.
 * @param {(index: number, newDialogue: string) => void} props.onDialogueChange - Callback to update the dialogue text.
 * @param {(oldName: string, newName: string, index: number) => void} props.onInitiateRename - Callback to start the speaker rename process.
 * @param {() => void} props.onTimestampClick - Callback for when the card is Ctrl/Cmd+Clicked, typically to seek audio.
 * @returns {JSX.Element} The rendered dialogue card component.
 */
const DialogueCard = ({ block, index, onDialogueChange, onInitiateRename, onTimestampClick }) => {
  const [isEditingSpeaker, setIsEditingSpeaker] = useState(false);
  const [tempSpeakerName, setTempSpeakerName] = useState(block.speaker);
  const speakerEditorRef = useRef(null);

  /**
   * Effect to automatically focus and select the input field when speaker editing is enabled.
   */
  useEffect(() => {
    if (isEditingSpeaker && speakerEditorRef.current) {
      speakerEditorRef.current.querySelector('input')?.focus();
      speakerEditorRef.current.querySelector('input')?.select();
    }
  }, [isEditingSpeaker]);

  /**
   * Effect to handle clicks outside of the speaker editor component.
   * If a click occurs outside, the editing mode is canceled.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (speakerEditorRef.current && !speakerEditorRef.current.contains(event.target)) {
        handleSpeakerCancel();
      }
    };
    if (isEditingSpeaker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditingSpeaker]);

  /**
   * Saves the temporary speaker name by calling the onInitiateRename prop
   * if the name has been changed. Exits speaker editing mode.
   */
  const handleSpeakerSave = () => {
    if (tempSpeakerName.trim() && tempSpeakerName.trim() !== block.speaker) {
      onInitiateRename(block.speaker, tempSpeakerName.trim(), index);
    }
    setIsEditingSpeaker(false);
  };

  /**
   * Cancels the speaker editing process, reverts the temporary name,
   * and exits speaker editing mode.
   */
  const handleSpeakerCancel = () => {
    setTempSpeakerName(block.speaker);
    setIsEditingSpeaker(false);
  };

  /**
   * Handles keyboard events for the speaker name input field.
   * 'Enter' saves the change, and 'Escape' cancels it.
   * @param {React.KeyboardEvent<HTMLInputElement>} e - The keyboard event.
   */
  const handleSpeakerKeyDown = (e) => {
    if (e.key === 'Enter') handleSpeakerSave();
    if (e.key === 'Escape') handleSpeakerCancel();
  };

  /**
   * Handles click events on the card to trigger the onTimestampClick callback
   * when the user holds Ctrl or Command key.
   * @param {React.MouseEvent<HTMLDivElement>} e - The mouse event.
   */
  const handleCardClick = (e) => {
    if (!onTimestampClick || isEditingSpeaker) return;
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        onTimestampClick();
    }
  };

  return (
    <div 
      className="mb-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      onClick={handleCardClick}
      title="Ctrl+Click (or ⌘+Click) to seek audio"
    >
      <div className="flex items-center gap-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
        <span className="select-none text-cyan-900 dark:text-cyan-500">{block.timestamp}</span>
        
        {isEditingSpeaker ? (
          <div ref={speakerEditorRef} className="flex items-center gap-2 rounded-md bg-gray-100 p-1 dark:bg-gray-700">
            <input
              type="text"
              value={tempSpeakerName}
              onChange={(e) => setTempSpeakerName(e.target.value)}
              onKeyDown={handleSpeakerKeyDown}
              className="bg-transparent text-sm font-semibold text-gray-800 focus:outline-none dark:text-gray-200"
            />
            <button onClick={handleSpeakerSave} className="text-green-600 hover:text-green-500" title="Confirm Rename">
              <FaCheck />
            </button>
            <button onClick={handleSpeakerCancel} className="text-red-600 hover:text-red-500" title="Cancel">
              <FaTimes />
            </button>
          </div>
        ) : (
          <div className="group flex cursor-pointer items-center gap-2" onClick={() => setIsEditingSpeaker(true)}>
            <span>{block.speaker}:</span>
            <FaEdit className="opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        )}
      </div>
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onDialogueChange(index, e.currentTarget.textContent || '')}
        className="mt-2 min-h-[2em] whitespace-pre-wrap rounded-md px-2 py-1 text-gray-800 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-900 dark:text-gray-200 dark:focus:bg-gray-700 dark:focus:ring-[#F05623]"
      >
        {block.dialogue}
      </div>
    </div>
  );
};

export default DialogueCard;