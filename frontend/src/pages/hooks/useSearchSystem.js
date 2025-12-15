import { useState, useEffect, useRef } from 'react';

/**
 * Search system hook.
 * Handles both left panel search and viewer content search functionality.
 */
export const useSearchSystem = ({
  selectedContent,
  viewerRef,
  leftPanelRef,
  isLeftPanelCollapsed,
  showCodeColors,
  setShowCodeColors,
  setActiveCodedSegmentId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewerSearchQuery, setViewerSearchQuery] = useState('');
  const [viewerSearchMatches, setViewerSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const searchInputRef = useRef(null);
  const viewerSearchInputRef = useRef(null);

  /**
   * Navigates to the next search match in the viewer.
   */
  const goToNextMatch = () => { 
    if (viewerSearchMatches.length > 0) {
      setCurrentMatchIndex(prev => (prev + 1) % viewerSearchMatches.length);
    }
  };

  /**
   * Navigates to the previous search match in the viewer.
   */
  const goToPrevMatch = () => { 
    if (viewerSearchMatches.length > 0) {
      setCurrentMatchIndex(prev => (prev - 1 + viewerSearchMatches.length) % viewerSearchMatches.length);
    }
  };

  /**
   * Handles changes to the viewer's search input field.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   */
  const handleViewerSearchChange = (e) => {
    const query = e.target.value;
    setViewerSearchQuery(query);
    if (query) {
      setActiveCodedSegmentId(null);
      if (showCodeColors) setShowCodeColors(false);
    }
  };

  /**
   * Clears the current search in the viewer.
   */
  const handleClearViewerSearch = () => {
    setViewerSearchQuery('');
    setViewerSearchMatches([]);
    setCurrentMatchIndex(-1);
  };

  // Effect to focus the search input when the left panel is expanded
  useEffect(() => {
    if (!isLeftPanelCollapsed && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isLeftPanelCollapsed]);

  // Effect to scroll the left panel to the top when the search query changes
  useEffect(() => {
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = 0;
    }
  }, [searchQuery]);

  // Effect to find and update search matches in the viewer content
  useEffect(() => {
    if (!viewerSearchQuery || !selectedContent) {
      setViewerSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }
    const searchRegex = new RegExp(viewerSearchQuery, 'gi');
    const matches = Array.from(selectedContent.matchAll(searchRegex)).map(match => ({
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      text: match[0],
    }));
    setViewerSearchMatches(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
  }, [viewerSearchQuery, selectedContent]);

  // Effect to scroll the active search match into view
  useEffect(() => {
    if (viewerSearchMatches.length > 0 && currentMatchIndex !== -1 && viewerRef.current) {
      const activeHighlightElement = viewerRef.current.querySelector('.viewer-search-highlight-active');
      if (activeHighlightElement) {
        activeHighlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatchIndex, viewerSearchMatches, viewerRef]);

  return {
    searchQuery,
    setSearchQuery,
    searchInputRef,
    viewerSearchQuery,
    setViewerSearchQuery,
    viewerSearchInputRef,
    viewerSearchMatches,
    setViewerSearchMatches,
    currentMatchIndex,
    setCurrentMatchIndex,
    goToNextMatch,
    goToPrevMatch,
    handleViewerSearchChange,
    handleClearViewerSearch,
  };
};