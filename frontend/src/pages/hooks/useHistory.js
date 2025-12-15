import { useState, useCallback } from 'react';

/**
 * A custom React hook to manage a file-scoped undo/redo history. It uses the
 * command pattern to execute actions, storing their inverse operations in undo/redo
 * stacks that are unique to each file ID.
 *
 * @param {string | null} currentFileId - The identifier for the currently active file. All history operations are scoped to this ID.
 * @returns {{
 * executeAction: (action: object) => Promise<object>,
 * undo: () => Promise<object|undefined>,
 * redo: () => Promise<object|undefined>,
 * canUndo: boolean,
 * canRedo: boolean
 * }} An object containing functions to manage the history and flags indicating undo/redo availability.
 */
export const useHistory = (currentFileId) => {
  const [history, setHistory] = useState({});

  // Locking state to prevent race conditions
  const [isExecuting, setIsExecuting] = useState(false);

  /**
   * Executes a new action, saves its inverse to the undo stack for the current
   * file, and clears the corresponding redo stack.
   * @param {object} action - The action to execute, containing `execute` and `undo` methods.
   * @returns {Promise<object>} The result of the action's execute method.
   */
  const executeAction = useCallback(async (action) => {
    // 2. MODIFY THIS: Check lock and return error if busy
    if (!currentFileId) return { success: false, error: 'No file selected' };
    if (isExecuting) return { success: false, error: 'Operation in progress' };

    setIsExecuting(true); // Lock
    try {
      const result = await action.execute();

      if (result.success) {
        const undoAction = {
          ...action.undo,
          undo: { ...action, undo: action.undo },
          context: result,
        };

        setHistory(prev => {
          const currentFileHistory = prev[currentFileId] || { undoStack: [], redoStack: [] };
          return {
            ...prev,
            [currentFileId]: {
              undoStack: [...currentFileHistory.undoStack, undoAction],
              redoStack: [],
            }
          };
        });
      }
      return result;
    } finally {
      setIsExecuting(false); // Unlock (always runs)
    }
  }, [currentFileId, isExecuting]);

  const undo = useCallback(async () => {
    const currentFileHistory = history[currentFileId];
    // 3. MODIFY THIS: Check lock
    if (!currentFileId || !currentFileHistory || currentFileHistory.undoStack.length === 0 || isExecuting) return;

    setIsExecuting(true); // Lock
    try {
      const actionToUndo = currentFileHistory.undoStack.at(-1);
      const result = await actionToUndo.execute(actionToUndo.context);

      if (result.success) {
        const redoAction = {
          ...actionToUndo.undo,
          context: result,
        };
        setHistory(prev => ({
          ...prev,
          [currentFileId]: {
            undoStack: currentFileHistory.undoStack.slice(0, -1),
            redoStack: [...currentFileHistory.redoStack, redoAction],
          }
        }));
      }
      return result;
    } finally {
      setIsExecuting(false); // Unlock
    }
  }, [currentFileId, history, isExecuting]);

  const redo = useCallback(async () => {
    const currentFileHistory = history[currentFileId];
    // 4. MODIFY THIS: Check lock
    if (!currentFileId || !currentFileHistory || currentFileHistory.redoStack.length === 0 || isExecuting) return;

    setIsExecuting(true); // Lock
    try {
      const actionToRedo = currentFileHistory.redoStack.at(-1);
      const result = await actionToRedo.execute(actionToRedo.context);

      if (result.success) {
        const undoAction = {
          ...actionToRedo.undo,
          undo: actionToRedo,
          context: result,
        };
        setHistory(prev => ({
          ...prev,
          [currentFileId]: {
            undoStack: [...currentFileHistory.undoStack, undoAction],
            redoStack: currentFileHistory.redoStack.slice(0, -1),
          }
        }));
      }
      return result;
    } finally {
      setIsExecuting(false); // Unlock
    }
  }, [currentFileId, history, isExecuting]);

  return {
    executeAction,
    undo,
    redo,
    canUndo: (history[currentFileId]?.undoStack.length || 0) > 0,
    canRedo: (history[currentFileId]?.redoStack.length || 0) > 0
  };
};