import React, { useState, useRef } from 'react';
import CustomTooltip from '../components/CustomTooltip.jsx';
import { FaStickyNote, FaTrashAlt } from 'react-icons/fa';
import { RiStickyNoteAddFill } from "react-icons/ri";
import { MdOutlineSwapHoriz } from "react-icons/md";
import DocumentToolbar from './DocumentToolbar.jsx';

/**
 * The primary component for displaying and interacting with document content.
 * It features a sophisticated rendering engine that overlays multiple layers of
 * annotations (codes, highlights, memos, search results) onto the text. It can
 * switch between a rich view mode and a plain text editing mode, and is
 * designed to handle both standard text and structured interview transcripts.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.isLeftPanelCollapsed - Flag indicating if the main side panel is collapsed.
 * @param {string|null} props.activeTool - The currently active tool in the toolbar.
 * @param {React.Dispatch<React.SetStateAction<string|null>>} props.setActiveTool - Function to set the active tool.
 * @param {boolean} props.showCodeColors - State indicating if coded segments should be colored.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowCodeColors - Function to toggle code color visibility.
 * @param {boolean} props.showCodeDropdown - State controlling the visibility of the code tool's dropdown.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowCodeDropdown - Function to toggle the code dropdown.
 * @param {boolean} props.showHighlightColorDropdown - State controlling the visibility of the highlight color picker.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowHighlightColorDropdown - Function to toggle the highlight color picker.
 * @param {string} props.selectedHighlightColor - The currently selected color for highlighting.
 * @param {React.Dispatch<React.SetStateAction<string>>} props.setSelectedHighlightColor - Function to set the highlight color.
 * @param {number} props.fontSize - The current font size of the document text.
 * @param {React.Dispatch<React.SetStateAction<number>>} props.setFontSize - Function to set the font size.
 * @param {number} props.lineHeight - The current line height of the document text.
 * @param {React.Dispatch<React.SetStateAction<number>>} props.setLineHeight - Function to set the line height.
 * @param {boolean} props.showLineHeightDropdown - State controlling the visibility of the line height dropdown.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowLineHeightDropdown - Function to toggle the line height dropdown.
 * @param {React.RefObject<HTMLInputElement>} props.viewerSearchInputRef - Ref for the search input field.
 * @param {string} props.viewerSearchQuery - The current search query.
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.handleViewerSearchChange - Handler for search input changes.
 * @param {Array<object>} props.viewerSearchMatches - Array of current search matches.
 * @param {number} props.currentMatchIndex - The index of the active search match.
 * @param {() => void} props.goToPrevMatch - Function to navigate to the previous search match.
 * @param {() => void} props.goToNextMatch - Function to navigate to the next search match.
 * @param {() => void} props.handleClearViewerSearch - Function to clear the search.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowFloatingToolbar - Function to toggle the selection toolbar.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowMemoModal - Function to toggle the memo modal.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowFloatingAssignCode - Function to toggle the code assignment popover.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowFloatingMemoInput - Function to toggle the memo input popover.
 * @param {string} props.selectedContent - The raw string content of the document to be displayed.
 * @param {Array<object>} props.codedSegments - Array of all coded segment objects for the document.
 * @param {Array<object>} props.inlineHighlights - Array of all highlight objects for the document.
 * @param {Array<object>} props.memos - Array of all memo objects for the document.
 * @param {string|null} props.activeCodedSegmentId - The ID of the currently active (clicked) coded segment.
 * @param {React.Dispatch<React.SetStateAction<string|null>>} props.setActiveCodedSegmentId - Function to set the active coded segment.
 * @param {(segmentId: string, segmentName: string) => void} props.handleDeleteCodedSegment - Function to handle the deletion of a coded segment.
 * @param {string|null} props.activeMemoId - The ID of the currently active memo.
 * @param {React.Dispatch<React.SetStateAction<string|null>>} props.setActiveMemoId - Function to set the active memo.
 * @param {React.Dispatch<React.SetStateAction<object|null>>} props.setMemoToEdit - Function to set the memo object that will be edited.
 * @param {(e: React.MouseEvent, segment: object) => void} props.handleReassignCodeClick - Function to initiate the code reassignment process.
 * @param {React.RefObject<HTMLDivElement>} props.viewerRef - Ref attached to the main viewer container.
 * @param {() => void} props.handleViewerMouseUp - Mouse up event handler on the viewer to process text selections.
 * @param {boolean} props.isEditing - Flag indicating if the viewer is in text-editing mode.
 * @param {string} props.content - The content being edited in the textarea.
 * @param {(e: React.ChangeEvent<HTMLTextAreaElement>) => void} props.onContentChange - Handler for changes to the textarea content.
 * @param {() => void} props.onUndo - Callback for the undo action.
 * @param {() => void} props.onRedo - Callback for the redo action.
 * @param {boolean} props.canUndo - Flag indicating if an undo action is available.
 * @param {boolean} props.canRedo - Flag indicating if a redo action is available.
 * @param {boolean} props.showCodeTooltip - Preference state for showing the code tooltip on hover.
 * @returns {JSX.Element} The rendered Document Viewer component.
 * @param {boolean} props.hasAudio - Flag indicating if the current document has an associated audio file.
 * @param {(seconds: number) => void} props.onTimestampClick - Callback function to seek audio when a timestamped line is clicked.
 * @param {boolean} props.showCodeTooltip - Preference state for showing the code tooltip on hover.
 * @returns {JSX.Element} The rendered Document Viewer component.
 */
const DocumentViewer = ({
  isLeftPanelCollapsed,
  activeTool,
  setActiveTool,
  showCodeColors,
  setShowCodeColors,
  showCodeDropdown,
  setShowCodeDropdown,
  showHighlightColorDropdown,
  setShowHighlightColorDropdown,
  selectedHighlightColor,
  setSelectedHighlightColor,
  fontSize,
  setFontSize,
  lineHeight,
  setLineHeight,
  showLineHeightDropdown,
  setShowLineHeightDropdown,
  viewerSearchInputRef,
  viewerSearchQuery,
  handleViewerSearchChange,
  viewerSearchMatches,
  currentMatchIndex,
  goToPrevMatch,
  goToNextMatch,
  handleClearViewerSearch,
  setShowFloatingToolbar,
  setShowMemoModal,
  setShowFloatingAssignCode,
  setShowFloatingMemoInput,
  selectedContent,
  codedSegments,
  inlineHighlights,
  memos,
  activeCodedSegmentId,
  setActiveCodedSegmentId,
  handleDeleteCodedSegment,
  activeMemoId,
  setActiveMemoId,
  setMemoToEdit,
  handleReassignCodeClick,
  viewerRef,
  handleViewerMouseUp,
  isEditing,
  content,
  onContentChange,
  handleCreateMemoForSegment,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  showCodeTooltip,
  hasAudio,
  onTimestampClick,
  textareaRef,
}) => {
  const [hoveredCodeId, setHoveredCodeId] = useState(null);
  const hoverTimeoutRef = useRef(null);
  const [tooltipData, setTooltipData] = useState({ visible: false, codes: [] });

  const transcriptLineRegex = /^(\[.+?\]\s+Speaker\s+[A-Z]:)/;

  const handleCodeMouseEnter = (codes) => {
    if (!showCodeTooltip) return;
    if (codes && codes.length > 0) {
      setTooltipData({ visible: true, codes: codes });
    }
  };

  const handleCodeMouseLeave = () => {
    setTooltipData({ visible: false, codes: [] });
  };

  /**
   * The core rendering engine for the document. It takes a text fragment and an
   * array of all annotations, then breaks the text into the smallest possible
   * sub-fragments based on annotation boundaries. Each sub-fragment is then
   * wrapped in styled `<span>` elements corresponding to the annotations that
   * cover it, effectively layering codes, highlights, and search results.
   * @param {string} text - The text content of the fragment to render.
   * @param {number} fragmentStartOffset - The starting character offset of this fragment within the entire document.
   * @param {Array<object>} allAnnotations - A combined array of all annotation types (codes, highlights, etc.).
   * @returns {Array<JSX.Element>} An array of React fragments and styled spans representing the annotated text.
   */
  const renderAnnotatedFragment = (text, fragmentStartOffset, allAnnotations) => {
    const fragmentEndOffset = fragmentStartOffset + text.length;
    const relevantAnnotations = allAnnotations.filter(ann =>
      Math.max(ann.startIndex, fragmentStartOffset) < Math.min(ann.endIndex, fragmentEndOffset)
    );

    const boundaryPoints = new Set([0, text.length]);
    relevantAnnotations.forEach(ann => {
      boundaryPoints.add(Math.max(0, ann.startIndex - fragmentStartOffset));
      boundaryPoints.add(Math.min(text.length, ann.endIndex - fragmentStartOffset));
    });

    const sortedPoints = Array.from(boundaryPoints).sort((a, b) => a - b);
    const subFragments = [];

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const start = sortedPoints[i];
      const end = sortedPoints[i + 1];
      if (start < end) {
        subFragments.push({
          text: text.substring(start, end),
          globalStart: fragmentStartOffset + start,
        });
      }
    }

    return subFragments.map((subFrag, index) => {
      const { text, globalStart } = subFrag;
      const globalEnd = globalStart + text.length;

      const coveringAnnotations = relevantAnnotations.filter(ann =>
        ann.startIndex <= globalStart && ann.endIndex >= globalEnd
      );
      const startingAnnotations = relevantAnnotations.filter(ann => ann.startIndex === globalStart);

      const style = {};
      const classNames = [];

      const codeAnns = coveringAnnotations.filter(a => a.type === 'code');
      const highlightAnn = coveringAnnotations.find(a => a.type === 'highlight');
      const searchAnn = coveringAnnotations.find(a => a.type === 'search');

      let stylingCodeAnn = null;
      if (codeAnns.length > 0) {
        codeAnns.sort((a, b) => (a.endIndex - a.startIndex) - (b.endIndex - b.startIndex));
        stylingCodeAnn = codeAnns[0];
      }

      if (stylingCodeAnn) {
        const innerColor = stylingCodeAnn.codeDefinition?.color || '#ccc';
        style.borderBottom = `1.3px dashed ${innerColor}`;

        const codesToDisplay = codeAnns.filter(ann =>
          (showCodeColors && activeCodedSegmentId !== ann._id) ||
          (!showCodeColors && activeCodedSegmentId === ann._id)
        );

        if (codesToDisplay.length === 1) {
          style.backgroundColor = (codesToDisplay[0].codeDefinition?.color || '#ccc') + '4D';
        } else if (codesToDisplay.length > 1) {
          const stripeHeight = 100 / codesToDisplay.length;
          const colorStops = codesToDisplay.map((ann, index) => {
            const color = ann.codeDefinition?.color || '#ccc';
            const start = index * stripeHeight;
            const end = (index + 1) * stripeHeight;
            return `${color}4D ${start.toFixed(2)}%, ${color}4D ${end.toFixed(2)}%`;
          }).join(', ');
          style.background = `linear-gradient(to bottom, ${colorStops})`;
        }

        classNames.push("relative cursor-help rounded px-0.5", "border-solid border-opacity-60");
      }

      if (highlightAnn) style.backgroundColor = highlightAnn.color + '33';

      if (searchAnn) {
        const isCurrentMatch = currentMatchIndex !== -1 && viewerSearchMatches[currentMatchIndex]?.startIndex === searchAnn.startIndex;
        style.backgroundColor = isCurrentMatch ? '#FF5733' : '#FFFF00';
        classNames.push(isCurrentMatch ? "viewer-search-highlight-active" : "viewer-search-highlight", "rounded", "px-0.5", "py-1");
      }

      let renderedText = text;
      if (Object.keys(style).length > 0 || classNames.length > 0) {
        renderedText = (
          <span
            style={style}
            className={classNames.join(' ')}
            onMouseEnter={() => handleCodeMouseEnter(codeAnns)}
            onMouseLeave={handleCodeMouseLeave}
          >
            {text}
          </span>
        );
      }

      const markers = startingAnnotations.map(ann => {
        if (ann.type === 'code') {
          return (
            <sup
              key={`sup-code-${ann._id}`}
              data-code-segment-id={ann._id}
              onClick={e => {
                e.stopPropagation();
                setActiveCodedSegmentId(prev => prev === ann._id ? null : ann._id);
              }}
              onMouseEnter={() => {
                clearTimeout(hoverTimeoutRef.current);
                setHoveredCodeId(ann._id);
              }}
              onMouseLeave={() => {
                hoverTimeoutRef.current = setTimeout(() => {
                  setHoveredCodeId(prev => (prev === ann._id ? null : prev));
                }, 100);
              }}
              className="relative ml-0.5 mr-0.5 cursor-pointer select-none rounded-full px-1 py-0.5 text-xs font-bold"
              style={{ backgroundColor: ann.codeDefinition?.color || '#ccc', color: '#FFF' }}
              title={`Code: ${ann.codeDefinition?.name}`}
            >
              <div
                onMouseEnter={() => { clearTimeout(hoverTimeoutRef.current); }}
                onMouseLeave={() => { hoverTimeoutRef.current = setTimeout(() => { setHoveredCodeId(prev => (prev === ann._id ? null : prev)); }, 100); }}
                className={`absolute bottom-full left-1/2 mb-0.5 flex -translate-x-1/2 transform items-center whitespace-nowrap transition-opacity z-10 ${hoveredCodeId === ann._id ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReassignCodeClick(e, ann);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-l bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
                  title={`Change Code - "${ann.codeDefinition?.name || 'Unnamed'}"`}
                >
                  <MdOutlineSwapHoriz size={17} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateMemoForSegment(ann);
                  }}
                  className="flex h-6 w-6 items-center justify-center bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
                  title={`Add Memo to "${ann.codeDefinition?.name || 'Unnamed'}"`}
                >
                  <RiStickyNoteAddFill size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCodedSegment(ann._id, ann.codeDefinition?.name || 'this segment');
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-r bg-gray-100 text-red-400 transition-colors hover:bg-gray-200 hover:text-red-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                  title="Delete Code Segment"
                >
                  <FaTrashAlt size={10} />
                </button>
              </div>
            </sup>
          );
        }
        if (ann.type === 'memo' && ann.startIndex !== -1 && ann.endIndex !== -1) {
          return (
            <sup
              key={`sup-memo-${ann._id}`}
              data-memo-id={ann._id}
              onClick={e => {
                e.stopPropagation();
                setActiveMemoId(prev => prev === ann._id ? null : ann._id);
                setMemoToEdit(ann);
                setShowMemoModal(true);
              }}
              className="ml-0.1 mr-0.1 cursor-pointer select-none align-super"
              title={`Memo: ${ann.title || 'No Title'}`}
            >
              <FaStickyNote
                className="inline-block"
                style={{ fontSize: '0.9rem', color: '#FFE135' }}
              />
            </sup>
          );
        }
        return null;
      }).filter(Boolean);

      return (
        <React.Fragment key={`${globalStart}-${index}`}>
          {markers}
          {renderedText}
        </React.Fragment>
      );
    });
  };

  /**
   * Parses a timestamp string (e.g., "[00:12:34]") into total seconds.
   * @param {string} timestampStr - The timestamp string from the document.
   * @returns {number|null} The total time in seconds, or null if invalid.
   */
  const parseTimestamp = (timestampStr) => {
    if (!timestampStr) return null;
    // This regex handles formats like [HH:MM:SS]
    const match = timestampStr.match(/(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return null;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;

    return hours * 3600 + minutes * 60 + seconds;
  };

  /**
   * The main content renderer. It determines if the document is a transcript
   * and applies a special block-based layout for speaker turns, or renders it
   * as a single block for standard text.
   * @returns {JSX.Element|Array<JSX.Element>} The fully rendered document content.
   */
  const renderContent = () => {
    if (typeof selectedContent !== 'string' || selectedContent.length === 0) {
      return <div className="text-gray-500">Select a document to view its contents.</div>;
    }

    const allAnnotations = [
      ...codedSegments.map(s => ({ ...s, type: 'code' })),
      ...inlineHighlights.map(h => ({ ...h, type: 'highlight' })),
      ...memos.map(m => ({ ...m, type: 'memo' })),
      ...viewerSearchMatches.map(m => ({ ...m, type: 'search' }))
    ];

    const blocks = selectedContent.split(/(?=\[[^\]]+\]\s+Speaker\s+[A-Z]:)/g).filter(block => block.trim() !== '');
    const isTranscript = blocks.length > 0 && blocks.every(block => block.match(transcriptLineRegex));

    if (!isTranscript) {
      return (
        <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }} className="selectable-dialogue text-justify">
          {renderAnnotatedFragment(selectedContent, 0, allAnnotations)}
        </div>
      );
    }

    let charOffset = 0;
    return blocks.map((block, index) => {
      const blockStartOffset = selectedContent.indexOf(block, charOffset);
      charOffset = blockStartOffset + block.length;
      const match = block.match(transcriptLineRegex);

      if (!match) {
        return (
          <p key={index} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }} className="selectable-dialogue">
            {renderAnnotatedFragment(block, blockStartOffset, allAnnotations)}
          </p>
        );
      }

      const header = match[1];
      const dialogue = block.substring(header.length);
      const headerOffset = blockStartOffset;
      const dialogueOffset = blockStartOffset + header.length;
      
      const handleBlockClick = (e) => {
        // Check for Ctrl key or Command key on Mac
        if (!e.ctrlKey && !e.metaKey) return;
        
        e.preventDefault();
        if (!hasAudio || !onTimestampClick) return;
        const timeInSeconds = parseTimestamp(header);
        if (timeInSeconds !== null) {
          onTimestampClick(timeInSeconds);
        }
      };

      return (
        <div 
          key={index}
          className="mb-4"
          onClick={handleBlockClick}
        >
          <div className="select-none font-semibold text-cyan-900 dark:text-gray-400">
            {renderAnnotatedFragment(header, headerOffset, allAnnotations)}
          </div>
          <div
            className="selectable-dialogue pl-8 text-justify text-gray-700 dark:text-gray-200"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {renderAnnotatedFragment(dialogue, dialogueOffset, allAnnotations)}
          </div>
        </div>
      );
    });
  };

  /**
   * Handles Ctrl+Click (or ⌘+Click) in the textarea during edit mode to seek audio.
   * @param {React.MouseEvent<HTMLTextAreaElement>} e - The mouse click event.
   */
  const handleTextareaClick = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    
    e.preventDefault();
    if (!hasAudio || !onTimestampClick) return;

    const textarea = e.currentTarget;
    const cursorPosition = textarea.selectionStart;
    const text = textarea.value;

    const lineStartIndex = text.lastIndexOf('\n', cursorPosition - 1) + 1;
    let lineEndIndex = text.indexOf('\n', cursorPosition);
    if (lineEndIndex === -1) {
      lineEndIndex = text.length;
    }

    const currentLine = text.substring(lineStartIndex, lineEndIndex);
    const match = currentLine.match(transcriptLineRegex);

    if (match) {
      const header = match[1];
      const timeInSeconds = parseTimestamp(header);
      if (timeInSeconds !== null) {
        onTimestampClick(timeInSeconds);
      }
    }
  };

  return (
    <div className={`flex flex-1 flex-col overflow-hidden rounded-xl shadow-md`}>
      <CustomTooltip
        visible={tooltipData.visible}
        codes={tooltipData.codes}
      />
      <DocumentToolbar
        isEditing={isEditing}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        showCodeColors={showCodeColors}
        setShowCodeColors={setShowCodeColors}
        showCodeDropdown={showCodeDropdown}
        setShowCodeDropdown={setShowCodeDropdown}
        showHighlightColorDropdown={showHighlightColorDropdown}
        setShowHighlightColorDropdown={setShowHighlightColorDropdown}
        selectedHighlightColor={selectedHighlightColor}
        setSelectedHighlightColor={setSelectedHighlightColor}
        setActiveCodedSegmentId={setActiveCodedSegmentId}
        fontSize={fontSize}
        setFontSize={setFontSize}
        lineHeight={lineHeight}
        setLineHeight={setLineHeight}
        showLineHeightDropdown={showLineHeightDropdown}
        setShowLineHeightDropdown={setShowLineHeightDropdown}
        viewerSearchInputRef={viewerSearchInputRef}
        viewerSearchQuery={viewerSearchQuery}
        handleViewerSearchChange={handleViewerSearchChange}
        viewerSearchMatches={viewerSearchMatches}
        currentMatchIndex={currentMatchIndex}
        goToPrevMatch={goToPrevMatch}
        goToNextMatch={goToNextMatch}
        handleClearViewerSearch={handleClearViewerSearch}
        setShowFloatingToolbar={setShowFloatingToolbar}
        setShowMemoModal={setShowMemoModal}
        setShowFloatingAssignCode={setShowFloatingAssignCode}
        setShowFloatingMemoInput={setShowFloatingMemoInput}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <div
        ref={viewerRef}
        onMouseUp={handleViewerMouseUp}
        className="flex-1 overflow-y-auto bg-white p-6 pt-7 custom-scrollbar dark:bg-gray-800"
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={onContentChange}
            onClick={handleTextareaClick}
            className="h-full w-full resize-none bg-transparent p-0 m-0 text-black focus:outline-none custom-scrollbar dark:text-gray-200"
            style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}
            placeholder="You can edit the document here..."
            title={hasAudio ? "Ctrl+Click (or ⌘+Click) on a line to seek audio" : ""}
          />
        ) : (
          <div
            className="text-black dark:text-gray-200"
            style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}
          >
            {renderContent()}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;