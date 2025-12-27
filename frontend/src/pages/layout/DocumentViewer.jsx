import React, { useState, useRef } from 'react';
import CodeTooltip from '../code/CodeTooltip.jsx';
import { FaStickyNote, FaTrashAlt } from 'react-icons/fa';
import { RiStickyNoteAddFill } from "react-icons/ri";
import { MdOutlineSwapHoriz } from "react-icons/md";
import DocumentToolbar from './DocumentToolbar.jsx';
import TranscriptEditor from './edit-mode/TranscriptEditor.jsx';
import TextEditor from './edit-mode/TextEditor.jsx';

/**
 * The primary component for displaying and interacting with document content.
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
  editMatches,
  currentEditMatchIndex,
  handleViewerMouseUp,
  handleViewerMouseDown, 
  isSelectingRef,
  // New Prop to reuse existing positioning logic from ProjectView/Hooks
  setFloatingMemoInputPosition 
}) => {
  const [hoveredCodeId, setHoveredCodeId] = useState(null);
  const hoverTimeoutRef = useRef(null);
  const [tooltipData, setTooltipData] = useState({ visible: false, codes: [] });

  const transcriptLineRegex = /^(\[.+?\]\s*.+?:)/;

  const handleCodeMouseEnter = (codes) => {
    if (isSelectingRef && isSelectingRef.current) return;
    if (!showCodeTooltip) return;
    if (codes && codes.length > 0) {
      setTooltipData({ visible: true, codes: codes });
    }
  };

  const handleCodeMouseLeave = () => {
    setTooltipData({ visible: false, codes: [] });
  };

  // Helper to calculate smart position for floating window
  const calculateFloatingPosition = (targetElement) => {
    const rect = targetElement.getBoundingClientRect();
    const panelWidth = 320; // Approx width of FloatingMemoInput
    const panelHeight = 350; // Approx height
    const margin = 10;
    
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + margin;

    // Boundary checks
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // If it goes off right edge, shift left
    if (left + panelWidth > viewportWidth) {
        left = viewportWidth - panelWidth - margin;
    }

    // If it goes off bottom edge, flip to top
    if (rect.bottom + panelHeight > viewportHeight) {
        top = rect.top + window.scrollY - panelHeight - margin;
    }
    
    return { top, left };
  };

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
                }, 200);
              }}
              className="relative ml-0.5 mr-0.5 cursor-pointer select-none rounded-full px-1 py-0.5 text-xs font-bold"
              style={{ backgroundColor: ann.codeDefinition?.color || '#ccc', color: '#FFF' }}
              title={`Code: ${ann.codeDefinition?.name}`}
            >
              <div
                onMouseEnter={() => { clearTimeout(hoverTimeoutRef.current); }}
                onMouseLeave={() => { hoverTimeoutRef.current = setTimeout(() => { setHoveredCodeId(prev => (prev === ann._id ? null : prev)); }, 100); }}
                className={`absolute bottom-full left-1/2 pb-1 flex -translate-x-1/2 transform items-center whitespace-nowrap transition-opacity z-10 ${hoveredCodeId === ann._id ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
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
                // --- CHANGED LOGIC START ---
                // Instead of modal, calculate position and open floating input
                const pos = calculateFloatingPosition(e.currentTarget);
                setActiveMemoId(prev => prev === ann._id ? null : ann._id);
                setMemoToEdit(ann);
                if (setFloatingMemoInputPosition) {
                    setFloatingMemoInputPosition(pos);
                }
                setShowFloatingMemoInput(true);
                // --- CHANGED LOGIC END ---
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

  const parseTimestamp = (timestampStr) => {
    if (!timestampStr) return null;
    const match = timestampStr.match(/(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return null;
    const hours = parseInt(match[1], 10), minutes = parseInt(match[2], 10), seconds = parseInt(match[3], 10);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
    return hours * 3600 + minutes * 60 + seconds;
  };

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

    const blocks = selectedContent.split(/(?=\[[^\]]+\]\s*.+?:)/g).filter(block => block.trim() !== '');
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

  return (
    <div className={`flex flex-1 flex-col overflow-hidden rounded-xl shadow-md`}>
      <CodeTooltip
        visible={tooltipData.visible}
        codes={tooltipData.codes}
        isSelectingRef={isSelectingRef}
      />
      {!isEditing && (
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
      )}
      <div
        ref={viewerRef}
        // --- UPDATED: Pass 'e' explicitly and handle logic ---
        onMouseUp={(e) => {
            if (isEditing && hasAudio) return;
            handleViewerMouseUp(e);
        }}
        onMouseDown={handleViewerMouseDown}
        className="flex-1 overflow-y-auto bg-white p-6 pt-7 custom-scrollbar dark:bg-gray-800"
      >
        {isEditing ? (
          hasAudio ? (
            <TranscriptEditor
              content={content}
              onContentChange={onContentChange}
              fontSize={fontSize}
              lineHeight={lineHeight}
              onTimestampClick={onTimestampClick}
              editMatches={editMatches}
              currentEditMatchIndex={currentEditMatchIndex}
            />
          ) : (
            <TextEditor
              content={content}
              onContentChange={onContentChange}
              fontSize={fontSize}
              lineHeight={lineHeight}
              onTimestampClick={onTimestampClick}
              hasAudio={hasAudio}
              editMatches={editMatches}
              currentEditMatchIndex={currentEditMatchIndex}
            />
          )
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