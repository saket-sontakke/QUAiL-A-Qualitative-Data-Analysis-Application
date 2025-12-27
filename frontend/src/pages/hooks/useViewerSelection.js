import { useState, useCallback, useEffect, useRef } from 'react';
import { getCharOffset, calculateFloatingPosition, snapRangeToWord } from './projectDOMUtils.js';

/**
 * Viewer selection management hook.
 * Handles text selection, floating toolbars, and selection-based actions.
 */
export const useViewerSelection = ({
  selectedFileId,
  selectedFileName,
  viewerRef,
  isInEditMode,
  setConfirmModalData,
  setShowConfirmModal,
  setCurrentMemoSelectionInfo,
  setMemoToEdit,
  setShowMemoModal,
  createHighlight,
  eraseHighlights,
  setShowHighlightColorDropdown,
  setShowCodeDropdown,
  showFloatingMemoInput,
  setShowFloatingMemoInput,
  floatingMemoInputPosition,
  setFloatingMemoInputPosition,
  smartSelectionEnabled = true
}) => {
  const [currentSelectionInfo, setCurrentSelectionInfo] = useState({
    text: '',
    startIndex: -1,
    endIndex: -1,
  });
  const [currentSelectionRange, setCurrentSelectionRange] = useState(null);
  const [activeTool, setActiveTool] = useState(null);

  // Floating UI states
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [floatingToolbarPosition, setFloatingToolbarPosition] = useState({ top: 0, left: 0 });
  const [showFloatingAssignCode, setShowFloatingAssignCode] = useState(false);
  const [floatingAssignCodePosition, setFloatingAssignCodePosition] = useState({ top: 0, left: 0 });

  // --- NEW: Track if user is currently selecting/dragging ---
  const isSelectingRef = useRef(false);

  /**
   * --- NEW: Handle Mouse Down ---
   * Sets the selecting flag to true and hides existing floating UIs.
   * Attach this to onMouseDown in your viewer component.
   */
  const handleViewerMouseDown = useCallback(() => {
    isSelectingRef.current = true;
    
    // Optional: clear floating menus immediately when a new click starts
    setShowFloatingToolbar(false);
    setShowFloatingAssignCode(false);
    setShowFloatingMemoInput(false);
  }, []);

  /**
   * Gets information about the current user text selection within the viewer panel.
   * @returns {{text: string, startIndex: number, endIndex: number}|null}
   */
  const getSelectionInfo = useCallback(() => {
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!selection || !range || !selectedFileName || !viewerRef.current || 
        !viewerRef.current.contains(range.commonAncestorContainer)) {
      return null;
    }
    const selectedText = selection.toString();
    if (!selectedText.trim()) {
      return null;
    }
    const startIndex = getCharOffset(viewerRef.current, range.startContainer, range.startOffset);
    const endIndex = getCharOffset(viewerRef.current, range.endContainer, range.endOffset);
    if (startIndex === -1 || endIndex === -1) {
      console.error("Failed to calculate accurate character offsets for selection.");
      return null;
    }
    return { text: selectedText, startIndex, endIndex };
  }, [selectedFileName, viewerRef]);

  /**
   * Handles the action of applying a code to the current text selection.
   * @param {{text: string, startIndex: number, endIndex: number}|null} [selectionInfoOverride=null]
   */
  const handleCodeSelectionAction = useCallback(async (selectionInfoOverride = null) => {
    const info = selectionInfoOverride || getSelectionInfo();
    if (!info || !selectedFileId) {
      setShowConfirmModal(true);
      setConfirmModalData({ 
        title: 'Code Error', 
        shortMessage: 'Please select text in a document to apply a code.', 
        onConfirm: () => setShowConfirmModal(false),
        confirmText: 'OK',
        showCancelButton: false
      });
      return;
    }
    setCurrentSelectionInfo(info);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    if (rects.length === 0) return;
    
    const position = calculateFloatingPosition(Array.from(rects), 240, 250);
    setFloatingAssignCodePosition(position);
    setShowFloatingAssignCode(true);
    window.getSelection().removeAllRanges();
  }, [selectedFileId, getSelectionInfo, setConfirmModalData, setShowConfirmModal]);

  /**
   * Handles the action of applying a highlight to the current text selection.
   * @param {{text: string, startIndex: number, endIndex: number}|null} [selectionInfoOverride=null]
   */
  const handleHighlightSelectionAction = useCallback(async (selectionInfoOverride = null) => {
    const info = selectionInfoOverride || getSelectionInfo();
    if (!info || !selectedFileId) {
      setShowConfirmModal(true);
      setConfirmModalData({ 
        title: 'Highlight Error', 
        shortMessage: 'Please select text in a document.', 
        onConfirm: () => setShowConfirmModal(false),
        confirmText: 'OK',
        showCancelButton: false
      });
      return;
    }
    await createHighlight(info);
    window.getSelection().removeAllRanges();
  }, [selectedFileId, getSelectionInfo, createHighlight, setConfirmModalData, setShowConfirmModal]);

  /**
   * Handles the action of creating a memo for the current text selection.
   * @param {{text: string, startIndex: number, endIndex: number}|null} [selectionInfoOverride=null]
   */
  const handleMemoSelectionAction = useCallback(async (selectionInfoOverride = null) => {
    const info = selectionInfoOverride || getSelectionInfo();
    if (!selectedFileId) {
      setShowConfirmModal(true);
      setConfirmModalData({ 
        title: 'Memo Error', 
        shortMessage: 'Please select a document to create a memo.', 
        onConfirm: () => setShowConfirmModal(false),
        confirmText: 'OK',
        showCancelButton: false
      });
      return;
    }
    setCurrentMemoSelectionInfo(info || { text: '', startIndex: -1, endIndex: -1 });
    setMemoToEdit(null);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    if (rects.length === 0) return;

    const position = calculateFloatingPosition(Array.from(rects), 320, 300);
    setFloatingMemoInputPosition(position);
    setShowFloatingMemoInput(true);
    window.getSelection().removeAllRanges();
  }, [selectedFileId, getSelectionInfo, setCurrentMemoSelectionInfo, setMemoToEdit, 
      setShowMemoModal, setConfirmModalData, setShowConfirmModal]);

  /**
   * Handles the action of erasing highlights within the current text selection.
   */
  const handleEraseSelectionAction = useCallback(async () => {
    const selectionInfo = getSelectionInfo();
    if (!selectionInfo || !selectedFileId) return;
    await eraseHighlights(selectionInfo);
    window.getSelection().removeAllRanges();
  }, [selectedFileId, getSelectionInfo, eraseHighlights]);

  /**
   * Handles the mouse up event in the viewer.
   * Checks for modifier keys to bypass "snappy" selection.
   * @param {MouseEvent} event - The mouse up event from the viewer
   */
  const handleViewerMouseUp = useCallback((event) => {
    // Reset selecting flag
    setTimeout(() => {
        isSelectingRef.current = false;
    }, 0);

    if (isInEditMode) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let range = selection.getRangeAt(0);
    let selectedText = selection.toString();
    
    // Hide menus initially
    setShowFloatingAssignCode(false);
    setShowFloatingMemoInput(false);
    setShowFloatingToolbar(false);
    
    // Validation
    if (selectedText.trim().length === 0 || !selectedFileId || !viewerRef.current || 
        !viewerRef.current.contains(selection.anchorNode)) {
      return;
    }

    // --- NEW: MODIFIER KEY CHECK ---
    // If Ctrl (Windows) or Cmd (Mac) is held, SKIP the snapping logic.
    const isModifierPressed = event.ctrlKey || event.metaKey;

    // Only snap if enabled AND modifier is NOT pressed
    if (smartSelectionEnabled && !isModifierPressed) {
       // --- SNAPPY LOGIC (Default) ---
       // automatically expand selection to word/sentence boundaries
       const snappedRange = snapRangeToWord(range);
       
       // Update visual selection
       selection.removeAllRanges();
       selection.addRange(snappedRange);

       // Update local vars
       range = snappedRange;
       selectedText = range.toString(); 
    } 
    // ELSE: We just keep the 'range' exactly as the user selected it.

    
    // --- WHITESPACE TRIMMING ---
    // We still keep this to prevent creating highlights with just empty spaces
    const leadingWhitespaceMatch = selectedText.match(/^\s+/);
    const trailingWhitespaceMatch = selectedText.match(/\s+$/);
    const leadingWhitespaceLength = leadingWhitespaceMatch ? leadingWhitespaceMatch[0].length : 0;
    const trailingWhitespaceLength = trailingWhitespaceMatch ? trailingWhitespaceMatch[0].length : 0;
    
    if (leadingWhitespaceLength > 0 || trailingWhitespaceLength > 0) {
      if (leadingWhitespaceLength > 0) {
        range.setStart(range.startContainer, range.startOffset + leadingWhitespaceLength);
      }
      if (trailingWhitespaceLength > 0) {
        range.setEnd(range.endContainer, range.endOffset - trailingWhitespaceLength);
      }
      
      // Update visual selection again if we trimmed
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Proceed with logic using the finalized 'range'
    const selectionInfo = getSelectionInfo(); 
    if (!selectionInfo) return;
    
    setCurrentSelectionRange(range);
    
    if (activeTool === 'code') {
      handleCodeSelectionAction(selectionInfo);
    } else if (activeTool === 'memo') {
      handleMemoSelectionAction(selectionInfo);
    } else if (activeTool === 'highlight') {
      handleHighlightSelectionAction(selectionInfo);
    } else if (activeTool === 'erase') {
      handleEraseSelectionAction();
    } else {
      const rects = range.getClientRects();
      if (rects.length === 0) return;
      
      const position = calculateFloatingPosition(Array.from(rects), 150, 36);
      setFloatingToolbarPosition(position);
      setShowFloatingToolbar(true);
    }
  }, [activeTool, selectedFileId, isInEditMode, handleCodeSelectionAction, handleMemoSelectionAction, 
      handleHighlightSelectionAction, handleEraseSelectionAction, getSelectionInfo, viewerRef, smartSelectionEnabled]);

  // Effect to handle clicks outside of floating UI elements to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isModalClick = event.target.closest('.define-code-modal-content, .confirmation-modal-content, .memo-modal-content');
      const isFloatingUiClick = event.target.closest('.floating-toolbar, .floating-assign-code, .floating-memo-input, .color-dropdown-menu, .code-dropdown-menu');
      if (!isModalClick && !isFloatingUiClick) {
        setShowFloatingToolbar(false);
        setShowFloatingAssignCode(false);
        setShowFloatingMemoInput(false);

        if (setShowHighlightColorDropdown) setShowHighlightColorDropdown(false);
        if (setShowCodeDropdown) setShowCodeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowHighlightColorDropdown, setShowCodeDropdown]);

  return {
    currentSelectionInfo,
    setCurrentSelectionInfo,
    currentSelectionRange,
    setCurrentSelectionRange,
    activeTool,
    setActiveTool,
    showFloatingToolbar,
    setShowFloatingToolbar,
    floatingToolbarPosition,
    setFloatingToolbarPosition,
    showFloatingAssignCode,
    setShowFloatingAssignCode,
    floatingAssignCodePosition,
    setFloatingAssignCodePosition,
    showFloatingMemoInput,
    setShowFloatingMemoInput,
    floatingMemoInputPosition,
    setFloatingMemoInputPosition,
    getSelectionInfo,
    handleCodeSelectionAction,
    handleHighlightSelectionAction,
    handleMemoSelectionAction,
    handleEraseSelectionAction,
    
    // Updated exports
    handleViewerMouseUp,
    handleViewerMouseDown, // Connect to onMouseDown
    isSelectingRef,        // Use in your hover logic
  };
};