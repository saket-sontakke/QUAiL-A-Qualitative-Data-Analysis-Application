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

  /**
   * Executes a new action, saves its inverse to the undo stack for the current
   * file, and clears the corresponding redo stack.
   * @param {object} action - The action to execute, containing `execute` and `undo` methods.
   * @returns {Promise<object>} The result of the action's execute method.
   */
  const executeAction = useCallback(async (action) => {
    if (!currentFileId) return { success: false, error: 'No file selected' };

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
  }, [currentFileId]);

  /**
   * Undoes the most recent action for the current file. It executes the undo
   * method of the last action and moves it to the redo stack.
   * @returns {Promise<object|undefined>} The result of the undo action, or undefined if no action is available.
   */
  const undo = useCallback(async () => {
    const currentFileHistory = history[currentFileId];
    if (!currentFileId || !currentFileHistory || currentFileHistory.undoStack.length === 0) return;

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
  }, [currentFileId, history]);

  /**
   * Redoes the most recently undone action for the current file. It executes the
   * redo action and moves it back to the undo stack.
   * @returns {Promise<object|undefined>} The result of the redo action, or undefined if no action is available.
   */
  const redo = useCallback(async () => {
    const currentFileHistory = history[currentFileId];
    if (!currentFileId || !currentFileHistory || currentFileHistory.redoStack.length === 0) return;

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
  }, [currentFileId, history]);

  return {
    executeAction,
    undo,
    redo,
    canUndo: (history[currentFileId]?.undoStack.length || 0) > 0,
    canRedo: (history[currentFileId]?.redoStack.length || 0) > 0
  };
};