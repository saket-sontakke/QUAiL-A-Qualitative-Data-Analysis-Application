import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaSearch,
    FaChevronUp,
    FaChevronDown,
    FaTimes,
    FaCaretDown,
    FaHighlighter,
    FaEraser,
    FaStickyNote
} from 'react-icons/fa';
import { MdCode, MdCodeOff } from 'react-icons/md';

/**
 * @constant highlightColors
 * @description Defines the available colors for the highlight tool, including their display name, hex value, and corresponding CSS class.
 */
const highlightColors = [
    { name: 'Yellow', value: '#FFFF00', cssClass: 'bg-yellow-300' },
    { name: 'Green', value: '#00FF00', cssClass: 'bg-green-300' },
    { name: 'Blue', value: '#ADD8E6', cssClass: 'bg-blue-300' },
    { name: 'Pink', value: '#FFC0CB', cssClass: 'bg-pink-300' },
];

/**
 * @component DocumentViewer
 * @description A component for displaying and interacting with document content,
 * including features like searching, highlighting, coding, and adding memos.
 */
const DocumentViewer = ({
    // State and Handlers for the Component
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

    // Viewer Search Functionality
    viewerSearchInputRef,
    viewerSearchQuery,
    handleViewerSearchChange,
    viewerSearchMatches,
    currentMatchIndex,
    goToPrevMatch,
    goToNextMatch,
    handleClearViewerSearch,

    // Floating Toolbars and Modals
    setShowFloatingToolbar,
    setShowMemoModal,
    setShowFloatingAssignCode,
    setShowFloatingMemoInput,

    // Document Content and Annotations
    selectedContent,
    codedSegments,
    inlineHighlights,
    memos,
    
    // Active Item States
    activeCodedSegmentId,
    setActiveCodedSegmentId,
    activeMemoId,
    setActiveMemoId,
    setMemoToEdit,

    // DOM Refs and Event Handlers
    viewerRef,
    handleViewerMouseUp,
}) => {

    /**
     * @function renderViewerToolbar
     * @description Renders the main toolbar for the document viewer, including search,
     * code, memo, highlight, and erase tools.
     */
    const renderViewerToolbar = () => (
        <div id="viewer-toolbar" className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-md font-semibold text-[#1D3C87] dark:text-[#F05623] ml-4">Document Viewer</h3>
            
            <div className="flex gap-2 items-center">
                {/* Search Bar for Viewer */}
                <div className="relative flex items-center">
                    <input
                        type="text"
                        ref={viewerSearchInputRef}
                        placeholder="Search..."
                        value={viewerSearchQuery}
                        onChange={handleViewerSearchChange}
                        className="w-64 pl-8 pr-28 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:focus:ring-[#F05623] text-sm"
                    />
                    <FaSearch className="absolute left-2 text-gray-400 dark:text-gray-500" />
                    {viewerSearchQuery && (
                        <div className="absolute right-0 flex items-center h-full pr-4 gap-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                {viewerSearchMatches.length > 0 ? `${currentMatchIndex + 1}/${viewerSearchMatches.length}` : '0/0'}
                            </span>
                            <div className="flex">
                                <button
                                    onClick={goToPrevMatch}
                                    disabled={viewerSearchMatches.length === 0}
                                    className={`p-1 rounded-sm text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 ${viewerSearchMatches.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Previous"
                                >
                                    <FaChevronUp size={12} />
                                </button>
                                <button
                                    onClick={goToNextMatch}
                                    disabled={viewerSearchMatches.length === 0}
                                    className={`p-1 rounded-sm text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 ${viewerSearchMatches.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Next"
                                >
                                    <FaChevronDown size={12} />
                                </button>
                            </div>
                            <button onClick={handleClearViewerSearch} className="p-1 text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300" title="Clear">
                                <FaTimes />
                            </button>
                        </div>
                    )}
                </div>

                {/* Code Tool Button with Display Options Dropdown */}
                <div className="relative flex rounded-md shadow-sm">
                    <button
                        onClick={() => {
                            setActiveTool(prev => (prev === 'code' ? null : 'code'));
                            setShowFloatingToolbar(false);
                            setShowHighlightColorDropdown(false);
                            setShowCodeDropdown(false);
                            setShowMemoModal(false);
                            setShowFloatingAssignCode(false);
                            setShowFloatingMemoInput(false);
                        }}
                        className={`px-3 py-2 rounded-l-md flex items-center transition-all duration-200 ${activeTool === 'code' ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        title="Code Text"
                    >
                        {showCodeColors ? (
                            <MdCode className="text-lg text-gray-800 dark:text-white" />
                        ) : (
                            <MdCodeOff className="text-lg text-gray-800 dark:text-white" />
                        )}
                    </button>
                    <button
                        onClick={() => {
                            setShowCodeDropdown(prev => {
                                const next = !prev;
                                if (next) setShowHighlightColorDropdown(false);
                                return next;
                            });
                        }}
                        className="p-2 pl-1 rounded-r-md border-l border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                        title="Code Display Options"
                    >
                        <FaCaretDown className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <AnimatePresence>
                        {showCodeDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute right-0 mt-12 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-lg p-2 z-50 code-dropdown-menu"
                            >
                                <button
                                    onClick={() => {
                                        setShowCodeColors(true);
                                        setShowCodeDropdown(false);
                                        setActiveCodedSegmentId(null);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs ${showCodeColors ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                    title="Enable Colored Codes"
                                >
                                    <MdCode size={18} />
                                    <span className="truncate">Show Codes</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCodeColors(false);
                                        setShowCodeDropdown(false);
                                        setActiveCodedSegmentId(null);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs ${!showCodeColors ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                    title="Disable Colored Codes"
                                >
                                    <MdCodeOff size={18} />
                                    <span className="truncate">Hide Codes</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Memo Tool Button */}
                <div className="relative flex rounded-md shadow-sm">
                    <button
                        onClick={() => {
                            setActiveTool(prev => (prev === 'memo' ? null : 'memo'));
                            setShowFloatingToolbar(false);
                            setShowHighlightColorDropdown(false);
                            setShowCodeDropdown(false);
                            setShowMemoModal(false);
                            setShowFloatingAssignCode(false);
                            setShowFloatingMemoInput(false);
                        }}
                        className={`px-3 py-2 rounded-md flex items-center transition-all duration-200 ${activeTool === 'memo' ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        title="Create/View Memos"
                    >
                        <FaStickyNote className="text-lg text-yellow-600 dark:text-yellow-300" />
                    </button>
                </div>

                {/* Highlight Tool Button with Color Picker Dropdown */}
                <div className="relative flex rounded-md shadow-sm">
                    <button
                        onClick={() => {
                            setActiveTool(prev => (prev === 'highlight' ? null : 'highlight'));
                            setShowFloatingToolbar(false);
                            setShowCodeDropdown(false);
                            setShowMemoModal(false);
                            setShowFloatingAssignCode(false);
                            setShowFloatingMemoInput(false);
                        }}
                        className={`p-2 pr-1 rounded-l-md flex items-center transition-all duration-200 ${activeTool === 'highlight' ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        title="Highlight Text"
                    >
                        <FaHighlighter className="text-lg mr-1" style={{ color: selectedHighlightColor }} />
                    </button>
                    <button
                        onClick={() => {
                            setShowHighlightColorDropdown(prev => {
                                const next = !prev;
                                if (next) {
                                    setShowCodeDropdown(false);
                                    setShowMemoModal(false);
                                }
                                return next;
                            });
                        }}
                        className="p-2 pl-1 rounded-r-md border-l border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                        title="Select Highlight Color"
                    >
                        <FaCaretDown className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <AnimatePresence>
                        {showHighlightColorDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute right-0 mt-12 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-lg p-2 z-50 color-dropdown-menu"
                            >
                                <div className="grid grid-cols-4 gap-2">
                                    {highlightColors.map((colorOption) => (
                                        <button
                                            key={colorOption.name}
                                            onClick={() => {
                                                setSelectedHighlightColor(colorOption.value);
                                                setShowHighlightColorDropdown(false);
                                            }}
                                            className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ease-in-out ${colorOption.cssClass} ${selectedHighlightColor === colorOption.value ? 'border-gray-800 dark:border-white' : 'border-transparent'}`}
                                            title={colorOption.name}
                                        ></button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Erase Tool Button */}
                <div className="relative flex rounded-md shadow-sm">
                    <button
                        onClick={() => {
                            setActiveTool(prev => (prev === 'erase' ? null : 'erase'));
                            setShowFloatingToolbar(false);
                            setShowHighlightColorDropdown(false);
                            setShowCodeDropdown(false);
                            setShowMemoModal(false);
                            setShowFloatingAssignCode(false);
                            setShowFloatingMemoInput(false);
                        }}
                        className={`px-3 py-2 rounded-md flex items-center transition-all duration-200 ${activeTool === 'erase' ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        title="Erase Highlights"
                    >
                        <FaEraser className="text-lg text-gray-800 dark:text-white" />
                    </button>
                </div>

            </div>
        </div>
    );

    /**
     * @function renderContent
     * @description Renders the document content by fragmenting it based on overlapping annotations
     * (codes, highlights, memos, search results) to ensure correct styling and interactivity.
     */
    const renderContent = () => {
        if (!selectedContent) {
            return 'Select a document to view its contents.';
        }

        // 1. Combine all annotations (codes, highlights, memos, search) into a single list.
        const allAnnotations = [
            ...codedSegments.map(s => ({ ...s, type: 'code' })),
            ...inlineHighlights.map(h => ({ ...h, type: 'highlight' })),
            ...memos.map(m => ({ ...m, type: 'memo' })),
            ...viewerSearchMatches.map(m => ({ ...m, type: 'search' }))
        ];

        // 2. Collect all unique start/end points to define fragment boundaries.
        const boundaryPoints = new Set([0, selectedContent.length]);
        allAnnotations.forEach(ann => {
            if (typeof ann.startIndex === 'number') boundaryPoints.add(ann.startIndex);
            if (typeof ann.endIndex === 'number') boundaryPoints.add(ann.endIndex);
        });
        
        // 3. Create a list of discrete, non-overlapping fragments based on boundary points.
        const sortedPoints = Array.from(boundaryPoints).sort((a, b) => a - b);
        const fragments = [];
        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const start = sortedPoints[i];
            const end = sortedPoints[i + 1];
            if (start < end) { // Ensure fragments are valid and have length.
                fragments.push({
                    start,
                    end,
                    text: selectedContent.substring(start, end),
                });
            }
        }
        
        // 4. Render each fragment, decorating it with all applicable annotations.
        return fragments.map(frag => {
            const { start, end, text } = frag;
            
            // Find all annotations that cover this fragment.
            const coveringAnnotations = allAnnotations.filter(
                ann => ann.startIndex <= start && ann.endIndex >= end
            );
            
            // Find annotations that begin at this fragment's start to place markers (e.g., memo icons).
            const startingAnnotations = allAnnotations.filter(ann => ann.startIndex === start);

            // Apply styles with a specific precedence: Search > Highlight > Code.
            const style = {};
            const classNames = [];
            
            const codeAnn = coveringAnnotations.find(a => a.type === 'code');
            const highlightAnn = coveringAnnotations.find(a => a.type === 'highlight');
            const searchAnn = coveringAnnotations.find(a => a.type === 'search');
            
            // Apply code styling.
            if (codeAnn) {
                const isActive = activeCodedSegmentId === codeAnn._id;
                let bg = '';
                if (showCodeColors) {
                    bg = isActive ? '' : (codeAnn.codeDefinition?.color || '#ccc') + '66';
                } else {
                    bg = isActive ? (codeAnn.codeDefinition?.color || '#ccc') + '66' : '';
                }
                if (bg) style.backgroundColor = bg;
                classNames.push("relative group cursor-help rounded px-0.5");
            }

            // Apply highlight styling (overwrites code background).
            if (highlightAnn) {
                style.backgroundColor = highlightAnn.color + '33';
            }

            // Apply search styling (overwrites both code and highlight backgrounds).
            if (searchAnn) {
                const isCurrentMatch = currentMatchIndex !== -1 && viewerSearchMatches[currentMatchIndex]?.startIndex === searchAnn.startIndex;
                style.backgroundColor = isCurrentMatch ? '#FF5733' : '#FFFF00';
                classNames.push(isCurrentMatch ? "viewer-search-highlight-active" : "viewer-search-highlight", "rounded", "px-0.5", "py-1");
            }

            let renderedText = text;
            if (Object.keys(style).length > 0 || classNames.length > 0) {
                renderedText = (
                    <span style={style} className={classNames.join(' ')}>
                        {text}
                    </span>
                );
            }
            
            // Prepend `sup` markers for memos and codes that start at this fragment.
            const markers = startingAnnotations.map(ann => {
                if (ann.type === 'code') {
                    return (
                        <sup key={`sup-code-${ann._id}`}
                            data-code-segment-id={ann._id}
                            onClick={e => { e.stopPropagation(); setActiveCodedSegmentId(prev => prev === ann._id ? null : ann._id); }}
                            className="ml-0.5 mr-0.5 px-1 py-0.5 rounded-full text-xs font-bold select-none cursor-pointer"
                            style={{ backgroundColor: ann.codeDefinition?.color || '#ccc', color: '#FFF' }}
                            title={`Code: ${ann.codeDefinition?.name}`}
                        />
                    );
                }
                if (ann.type === 'memo' && ann.startIndex !== -1 && ann.endIndex !== -1) {
                    return (
                        <sup key={`sup-memo-${ann._id}`}
                            data-memo-id={ann._id}
                            onClick={e => { e.stopPropagation(); setActiveMemoId(prev => prev === ann._id ? null : ann._id); setMemoToEdit(ann); setShowMemoModal(true); }}
                            className="ml-0.1 mr-0.1 cursor-pointer select-none align-super"
                            title={`Memo: ${ann.title || 'No Title'}`}
                        >
                            <FaStickyNote className="inline-block" style={{ fontSize: '0.9rem', color: '#FFE135' }} />
                        </sup>
                    );
                }
                return null;
            }).filter(Boolean);

            // Return the markers followed by the styled text fragment.
            return (
                <React.Fragment key={`${start}-${end}`}>
                    {markers}
                    {renderedText}
                </React.Fragment>
            );
        });
    };

    // Main component render method.
    return (
        <div className={`flex flex-col rounded-xl shadow-md overflow-hidden flex-1`}>
            {renderViewerToolbar()}
            <div 
                ref={viewerRef} 
                onMouseUp={handleViewerMouseUp}
                className="bg-white dark:bg-gray-800 p-6 overflow-y-auto flex-1"
            >
                <pre className="whitespace-pre-wrap text-sm text-black dark:text-gray-200 select-text">
                    {renderContent()}
                </pre>
            </div>
        </div>
    );
};

export default DocumentViewer;
