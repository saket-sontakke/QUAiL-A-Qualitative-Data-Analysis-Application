/**
 * @file Test suite for the useProjectViewHooks custom hook.
 * @description This file contains a comprehensive set of unit and integration tests
 * for the `useProjectViewHooks`, covering initialization, state management, API interactions,
 * and user-facing functionality like file management, coding, highlighting, and memos.
 */

// --------------------------------------------------------------------------------
// Imports
// --------------------------------------------------------------------------------

import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import useProjectViewHooks from '../../src/pages/hooks/Hooks.jsx';
import { ProjectContext } from '../../src/pages/ProjectContext.jsx';

// --------------------------------------------------------------------------------
// Mocks Setup
// --------------------------------------------------------------------------------

// Mock Axios for controlled API testing.
const mockAxios = new MockAdapter(axios);

// Mock browser APIs to simulate a realistic environment for the hook.
const mockLocalStorage = {
  getItem: vi.fn((key) => {
    switch (key) {
      case 'token': return 'mock-token';
      case 'userId': return 'mock-user-id';
      case 'username': return 'mock-username';
      default: return null;
    }
  }),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

const mockRange = {
  setStart: vi.fn(),
  setEnd: vi.fn(),
  getClientRects: vi.fn(() => [{
    bottom: 100,
    right: 200,
    left: 100,
    top: 80,
    width: 100,
    height: 20
  }]),
  commonAncestorContainer: document.createElement('div')
};

const mockSelection = {
  toString: vi.fn(() => ''),
  rangeCount: 0,
  getRangeAt: vi.fn(() => mockRange),
  removeAllRanges: vi.fn(),
  anchorNode: null
};

Object.defineProperty(window, 'getSelection', {
  value: vi.fn(() => mockSelection),
  writable: true
});

Object.defineProperty(document, 'createRange', {
  value: vi.fn(() => mockRange),
  writable: true
});

Object.defineProperty(document, 'createTreeWalker', {
  value: vi.fn(() => ({
    nextNode: vi.fn(() => null)
  })),
  writable: true
});

// Mock file download related APIs.
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();
global.Blob = vi.fn((content, options) => ({ content, options }));


// --------------------------------------------------------------------------------
// Test Data and Wrappers
// --------------------------------------------------------------------------------

/**
 * A wrapper component that provides a mocked React Router context.
 * This is necessary for hooks that rely on `useParams`.
 */
const wrapperWithRouter = ({ children }) => (
  <MemoryRouter initialEntries={['/project/test-project-id']}>
    <Routes>
      <Route path="/project/:id" element={children} />
    </Routes>
  </MemoryRouter>
);

/**
 * Consistent mock project data used across multiple tests to ensure a stable
 * and predictable test environment.
 */
const mockProject = {
  _id: 'test-project-id',
  name: 'Test Project',
  importedFiles: [
    {
      _id: 'file-1',
      name: 'test-file-1.txt',
      content: 'This is test content for file 1. It has multiple sentences. Each sentence can be coded or highlighted.'
    },
    {
      _id: 'file-2',
      name: 'test-file-2.txt',
      content: 'This is another test file content.'
    }
  ],
  codedSegments: [
    {
      _id: 'segment-1',
      fileId: 'file-1',
      text: 'test content',
      startIndex: 8,
      endIndex: 20,
      codeDefinition: {
        _id: 'code-def-1',
        name: 'Important',
        color: '#FF0000'
      }
    }
  ],
  inlineHighlights: [
    {
      _id: 'highlight-1',
      fileId: 'file-1',
      text: 'highlighted',
      startIndex: 68,
      endIndex: 79,
      color: '#FFFF00'
    }
  ],
  codeDefinitions: [
    {
      _id: 'code-def-1',
      name: 'Important',
      description: 'Important content',
      color: '#FF0000'
    }
  ],
  memos: [
    {
      _id: 'memo-1',
      fileId: 'file-1',
      title: 'Test Memo',
      content: 'This is a test memo',
      text: 'memo text',
      startIndex: 50,
      endIndex: 59,
      author: 'test-user',
      authorId: 'user-1'
    }
  ]
};

// --------------------------------------------------------------------------------
// Global Test Hooks (beforeEach / afterEach)
// --------------------------------------------------------------------------------

beforeEach(() => {
  // Reset Axios mocks to ensure no interference between tests.
  mockAxios.reset();
  // Clear all Vitest mocks.
  vi.clearAllMocks();

  // Reset mock selection state to a clean default for each test.
  mockSelection.toString.mockReturnValue('');
  mockSelection.rangeCount = 0;
  mockSelection.anchorNode = null;
  mockRange.getClientRects.mockReturnValue([{
    bottom: 100,
    right: 200,
    left: 100,
    top: 80,
    width: 100,
    height: 20
  }]);
});

afterEach(() => {
  // Ensure all mocks are restored to their original implementations after each test.
  mockAxios.reset();
  vi.restoreAllMocks();
});

// --------------------------------------------------------------------------------
// Test Suites
// --------------------------------------------------------------------------------

describe('useProjectViewHooks - Initialization and Basic State', () => {
  /**
   * Verifies that the hook initializes with the correct default state values
   * before any asynchronous operations complete.
   */
  it('should initialize with correct default values', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);

    const { result } = renderHook(() => useProjectViewHooks(), {
      wrapper: wrapperWithRouter
    });

    // Assert initial synchronous state
    expect(result.current.project).toBe(null);
    expect(result.current.projectName).toBe('');
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe('');
    expect(result.current.selectedFileId).toBe(null);
    expect(result.current.codedSegments).toEqual([]);
    expect(result.current.inlineHighlights).toEqual([]);
    expect(result.current.codeDefinitions).toEqual([]);
    expect(result.current.memos).toEqual([]);
    expect(result.current.isLeftPanelCollapsed).toBe(false);
    expect(result.current.selectedHighlightColor).toBe('#00FF00');
    expect(result.current.activeTool).toBe(null);
    expect(result.current.currentSelectionInfo.text).toBe('');

    // Wait for async effects (initial data fetch) to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  /**
   * Tests the primary data fetching logic on component mount, ensuring the project
   * data is loaded and the first file is automatically selected.
   */
  it('should fetch project data on mount and select the first file', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`)
      .reply(200, mockProject);

    const { result } = renderHook(() => useProjectViewHooks(), {
      wrapper: wrapperWithRouter
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.project).toEqual(mockProject);
    expect(result.current.projectName).toBe('Test Project');
    expect(result.current.codeDefinitions).toEqual(mockProject.codeDefinitions);
    expect(result.current.selectedFileName).toBe('test-file-1.txt');
    expect(result.current.selectedFileId).toBe('file-1');
    expect(result.current.selectedContent).toBe(mockProject.importedFiles[0].content);
  });

  /**
   * Verifies that the hook correctly handles and stores an error state when the
   * initial project data fetch fails.
   */
  it('should handle fetch project error', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/projects/test-project-id`)
      .reply(500, { message: 'Server error' });

    const { result } = renderHook(() => useProjectViewHooks(), {
      wrapper: wrapperWithRouter
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load project');
  });
});

describe('useProjectViewHooks - File Management', () => {
  // Pre-load project data for all tests in this suite.
  beforeEach(() => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`)
      .reply(200, mockProject);
  });

  /**
   * Tests that selecting a different file updates the relevant state, including
   * content, name, ID, and filtered segments/highlights.
   */
  it('should handle file selection correctly', async () => {
    const { result } = renderHook(() => useProjectViewHooks(), {
      wrapper: wrapperWithRouter
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleSelectFile(mockProject.importedFiles[1]);
    });

    expect(result.current.selectedContent).toBe('This is another test file content.');
    expect(result.current.selectedFileName).toBe('test-file-2.txt');
    expect(result.current.selectedFileId).toBe('file-2');
    expect(result.current.codedSegments).toEqual([]);
    expect(result.current.inlineHighlights).toEqual([]);
  });

  /**
   * Verifies the file upload functionality, ensuring the API is called and the
   * project state is updated with the new file.
   */
  it('should handle file upload successfully', async () => {
    const updatedProject = {
      ...mockProject,
      importedFiles: [
        ...mockProject.importedFiles,
        { _id: 'file-3', name: 'new-file.txt', content: 'New file content' }
      ]
    };

    mockAxios.onPost(`${import.meta.env.VITE_BACKEND_URL}/api/projects/import/test-project-id`)
      .reply(200, { project: updatedProject });

    const { result } = renderHook(() => useProjectViewHooks(), {
      wrapper: wrapperWithRouter
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const mockFile = new File(['test content'], 'new-file.txt', { type: 'text/plain' });
    const mockEvent = {
      target: {
        files: [mockFile]
      }
    };

    await act(async () => {
      await result.current.handleFileChange(mockEvent);
    });

    await waitFor(() => {
      expect(result.current.project.importedFiles).toHaveLength(3);
    });

    expect(result.current.project.importedFiles[2].name).toBe('new-file.txt');
  });

  /**
   * Ensures that if a file upload fails, an appropriate error modal is shown.
   */
  it('should handle file upload error', async () => {
    mockAxios.onPost(`${import.meta.env.VITE_BACKEND_URL}/api/projects/import/test-project-id`)
      .reply(500, { message: 'Upload failed' });

    const { result } = renderHook(() => useProjectViewHooks(), {
      wrapper: wrapperWithRouter
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const mockEvent = {
      target: {
        files: [mockFile]
      }
    };

    await act(async () => {
      await result.current.handleFileChange(mockEvent);
    });

    expect(result.current.showConfirmModal).toBe(true);
    expect(result.current.confirmModalData.title).toBe('Import Failed');
    expect(result.current.confirmModalData.message).toContain('Failed to import file.');
  });

  /**
   * Tests the end-to-end file deletion flow, from triggering the confirmation
   * modal to updating the project state upon successful deletion.
   */
  it('should delete a file from the project state', async () => {
      mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);

      const { result } = renderHook(() => useProjectViewHooks(), {
        wrapper: wrapperWithRouter,
      });

      await waitFor(() => expect(result.current.project.importedFiles).toHaveLength(2));

      mockAxios.resetHandlers();

      const projectAfterDelete = {
        ...mockProject,
        importedFiles: [mockProject.importedFiles[1]], 
      };

      mockAxios.onDelete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/files/file-1`).reply(200);
      mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, projectAfterDelete);

      act(() => {
        result.current.handleDeleteFile('file-1', 'test-file-1.txt');
      });
      await act(async () => {
        await result.current.confirmModalData.onConfirm();
      });

      await waitFor(() => {
        expect(result.current.project.importedFiles).toHaveLength(1);
        expect(result.current.project.importedFiles[0].name).toBe('test-file-2.txt');
      });
  });
});

describe('useProjectViewHooks - Code Management', () => {
  beforeEach(() => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
  });

  /**
   * Verifies that assigning a code to a text selection works correctly, updating
   * the project state with the new coded segment.
   */
  it('should handle code assignment successfully', async () => {
    const newSegment = {
      _id: 'segment-2',
      fileId: 'file-1',
      text: 'selected text',
      startIndex: 10,
      endIndex: 23,
      codeDefinition: mockProject.codeDefinitions[0]
    };
    const updatedProject = { ...mockProject, codedSegments: [...mockProject.codedSegments, newSegment] };

    mockAxios.onPost(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/code`).reply(200, { project: updatedProject });

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setCurrentSelectionInfo({ text: 'selected text', startIndex: 10, endIndex: 23 });
      result.current.setShowFloatingAssignCode(true);
    });

    await act(async () => {
      await result.current.handleAssignCode('code-def-1');
    });

    expect(result.current.showFloatingAssignCode).toBe(false);
    expect(result.current.project.codedSegments).toHaveLength(2);
  });

  /**
   * Ensures that an error during code assignment triggers a confirmation modal.
   */
  it('should handle code assignment error', async () => {
    mockAxios.onPost(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/code`).reply(500, { message: 'Code assignment failed' });

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setCurrentSelectionInfo({ text: 'selected text', startIndex: 10, endIndex: 23 });
    });

    await act(async () => {
      await result.current.handleAssignCode('code-def-1');
    });

    expect(result.current.showConfirmModal).toBe(true);
    expect(result.current.confirmModalData.title).toBe('Coding Failed');
  });

  /**
   * Tests the creation of a new code definition, followed by a data refetch
   * to ensure the UI state is correctly updated.
   */
  it('should save a new code definition successfully', async () => {
    mockAxios.onPost(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/code-definitions`).reply(200, {});
    const projectWithNewCode = { ...mockProject, codeDefinitions: [...mockProject.codeDefinitions, { _id: 'new-def', name: 'New Code' }] };

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSaveCodeDefinition({
        name: 'New Code',
        description: 'New code description',
        color: '#0000FF'
      });
    });

    // Simulate the refetch that happens after a successful save
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, projectWithNewCode);
    await act(async () => {
      await result.current.fetchProject();
    });

    expect(result.current.showDefineCodeModal).toBe(false);
    expect(result.current.codeDefinitionToEdit).toBe(null);
    expect(result.current.codeDefinitions.length).toBe(mockProject.codeDefinitions.length + 1);
  });

  /**
   * Verifies that updating an existing code definition calls the correct API endpoint (PUT).
   */
  it('should update an existing code definition', async () => {
    mockAxios.onPut(`${import.meta.env.VITE_BACKEND_URL}/test-project-id/code-definitions/code-def-1`).reply(200, {});

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSaveCodeDefinition({
        _id: 'code-def-1',
        name: 'Updated Code',
        description: 'Updated description',
        color: '#0000FF'
      });
    });

    expect(result.current.showDefineCodeModal).toBe(false);
    expect(mockAxios.history.put.length).toBe(1);
  });

  /**
   * Tests the error handling within the 'Define Code' modal, ensuring form errors
   * are correctly propagated.
   */
  it('should handle code definition save error', async () => {
    mockAxios.onPost(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/code-definitions`).reply(500, { error: 'Save failed' });

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const mockErrorSetter = vi.fn();
    act(() => {
      result.current.handleDefineModalErrorSetter(mockErrorSetter);
    });

    await act(async () => {
      await result.current.handleSaveCodeDefinition({
        name: 'New Code',
        description: 'New code description',
        color: '#0000FF'
      });
    });

    expect(mockErrorSetter).toHaveBeenLastCalledWith('Save failed');
  });

  /**
   * Verifies the deletion flow for a code definition, including the confirmation modal.
   */
  it('should delete a code definition', async () => {
    mockAxios.onDelete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/code-definitions/code-def-1`).reply(200, {});

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleDeleteCodeDefinition('code-def-1', 'Important');
    });

    expect(result.current.showConfirmModal).toBe(true);
    expect(result.current.confirmModalData.title).toBe('Confirm Code Deletion');

    await act(async () => {
      await result.current.confirmModalData.onConfirm();
    });

    expect(result.current.showConfirmModal).toBe(false);
    expect(mockAxios.history.delete.length).toBe(1);
  });

  /**
   * Verifies the deletion flow for an individual coded segment.
   */
  it('should delete a coded segment', async () => {
    mockAxios.onDelete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/code/segment-1`).reply(200, {});

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleDeleteCodedSegment('segment-1', 'test content');
    });

    expect(result.current.showConfirmModal).toBe(true);

    await act(async () => {
      await result.current.confirmModalData.onConfirm();
    });

    expect(result.current.showConfirmModal).toBe(false);
    expect(mockAxios.history.delete.length).toBe(1);
  });
});

describe('useProjectViewHooks - Highlight Management', () => {
  /**
   * Tests that creating a highlight from a text selection calls the correct API
   * with the appropriate payload.
   */
  it('should handle highlight selection action successfully', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    mockAxios.onPost(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/highlight`).reply(200, { project: mockProject });

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const mockSelectionInfo = { text: 'selected text', startIndex: 10, endIndex: 23 };

    await act(async () => {
      await result.current.handleHighlightSelectionAction(mockSelectionInfo);
    });

    const requestData = JSON.parse(mockAxios.history.post[0].data);
    expect(requestData.text).toBe('selected text');
    expect(requestData.color).toBe('#00FF00');
  });

  /**
   * Ensures that attempting to highlight text without a file selected results in an error modal.
   */
  it('should handle highlight without a selected file', async () => {
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });

    const mockSelectionInfo = { text: 'selected text', startIndex: 10, endIndex: 23 };

    await act(async () => {
      await result.current.handleHighlightSelectionAction(mockSelectionInfo);
    });

    expect(result.current.showConfirmModal).toBe(true);
    expect(result.current.confirmModalData.title).toBe('Highlight Error');
  });

  /**
   * Tests the eraser tool functionality, ensuring that it correctly identifies
   * overlapping highlights within a selection and calls the bulk delete API.
   */
  it('should handle erase selection action by bulk deleting overlapping highlights', async () => {
    const projectAfterErase = { ...mockProject, inlineHighlights: [] };
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    mockAxios.onPost(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/highlight/delete-bulk`).reply(200, { project: projectAfterErase });

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.selectedFileId).toBe('file-1'));

    // Setup mock DOM environment for selection calculation
    const contentContainer = document.createElement('div');
    const textNode = document.createTextNode(mockProject.importedFiles[0].content);
    contentContainer.appendChild(textNode);
    act(() => { result.current.viewerRef.current = contentContainer; });

    const startIndex = 68;
    const endIndex = 79;
    mockSelection.toString.mockReturnValue('highlighted');
    mockSelection.rangeCount = 1;
    mockSelection.anchorNode = contentContainer;
    mockRange.commonAncestorContainer = contentContainer;
    mockRange.startContainer = textNode;
    mockRange.endContainer = textNode;
    mockRange.startOffset = startIndex;
    mockRange.endOffset = endIndex;

    vi.spyOn(document, 'createTreeWalker').mockImplementation(() => ({
      nextNode: vi.fn().mockReturnValueOnce(textNode).mockReturnValueOnce(null),
    }));

    await act(async () => {
      await result.current.handleEraseSelectionAction();
    });

    expect(mockAxios.history.post).toHaveLength(1);
    const bulkDeleteRequest = mockAxios.history.post[0];
    expect(bulkDeleteRequest.url).toBe(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/highlight/delete-bulk`);
    expect(JSON.parse(bulkDeleteRequest.data)).toEqual({ ids: ['highlight-1'] });
    expect(result.current.project.inlineHighlights).toEqual([]);
  });
});

describe('useProjectViewHooks - Memo Management', () => {
  /**
   * Verifies that saving a new memo works correctly and closes the relevant modals.
   */
  it('should save a new memo successfully', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    mockAxios.onPost(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/memos`).reply(200, { project: mockProject });

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSaveMemo({
        title: 'New Memo',
        content: 'New memo content'
      });
    });

    expect(result.current.showMemoModal).toBe(false);
    expect(result.current.showFloatingMemoInput).toBe(false);
    expect(result.current.memoToEdit).toBe(null);
  });

  /**
   * Tests that updating an existing memo calls the correct PUT endpoint.
   */
  it('should update an existing memo', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    mockAxios.onPut(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/memos/memo-1`).reply(200, { project: mockProject });

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSaveMemo({
        _id: 'memo-1',
        title: 'Updated Memo',
        content: 'Updated memo content'
      });
    });

    expect(result.current.showMemoModal).toBe(false);
  });

  /**
   * Ensures that a memo save failure results in an error modal.
   */
  it('should handle memo save error', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    mockAxios.onPost(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/memos`).reply(500, { message: 'Memo save failed' });

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSaveMemo({
        title: 'New Memo',
        content: 'New memo content'
      });
    });

    expect(result.current.showConfirmModal).toBe(true);
    expect(result.current.confirmModalData.title).toBe('Save Memo Failed');
  });

  /**
   * Verifies the memo deletion flow, from confirmation to state update.
   */
  it('should delete a memo', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    mockAxios.onDelete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/memos/memo-1`).reply(200, {});
    // A refetch is triggered after deletion
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleDeleteMemo('memo-1', 'Test Memo');
    });

    expect(result.current.showConfirmModal).toBe(true);
    expect(result.current.confirmModalData.title).toBe('Confirm Memo Deletion');

    await act(async () => {
      await result.current.confirmModalData.onConfirm();
    });

    expect(result.current.showConfirmModal).toBe(false);
    expect(result.current.activeMemoId).toBe(null);
  });

  /**
   * Tests that selecting text and choosing the "Memo" action correctly opens the
   * floating memo input with the selection details.
   */
  it('should handle memo selection action', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const mockSelectionInfo = { text: 'selected text', startIndex: 10, endIndex: 23 };
    act(() => {
      result.current.setCurrentSelectionRange(mockRange);
    });

    await act(async () => {
      await result.current.handleMemoSelectionAction(mockSelectionInfo);
    });

    expect(result.current.showFloatingMemoInput).toBe(true);
    expect(result.current.currentMemoSelectionInfo).toEqual(mockSelectionInfo);
  });
});

describe('useProjectViewHooks - Search Functionality', () => {
  /**
   * Verifies that the search functionality correctly finds matches in the
   * selected file's content and updates the state.
   */
  it('should handle viewer search change and find matches', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const mockEvent = { target: { value: 'test' } };
    act(() => {
      result.current.handleViewerSearchChange(mockEvent);
    });

    expect(result.current.viewerSearchQuery).toBe('test');
    // Based on `mockProject` content: "This is test content..."
    expect(result.current.viewerSearchMatches).toEqual([{ text: 'test', startIndex: 8, endIndex: 12 }]);
    expect(result.current.currentMatchIndex).toBe(0);
  });

  /**
   * Tests that the clear search function resets all search-related state.
   */
  it('should clear viewer search', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Set initial search state
    act(() => {
      result.current.setViewerSearchQuery('test query');
      result.current.setViewerSearchMatches([{ startIndex: 0, endIndex: 4 }]);
      result.current.setCurrentMatchIndex(0);
    });

    // Clear the search
    act(() => {
      result.current.handleClearViewerSearch();
    });

    expect(result.current.viewerSearchQuery).toBe('');
    expect(result.current.viewerSearchMatches).toEqual([]);
    expect(result.current.currentMatchIndex).toBe(-1);
  });

  /**
   * Verifies that the next/previous match navigation works correctly and wraps around.
   */
  it('should navigate search matches', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Set up multiple matches
    act(() => {
      result.current.setViewerSearchMatches([
        { startIndex: 0, endIndex: 4 },
        { startIndex: 10, endIndex: 14 },
        { startIndex: 20, endIndex: 24 }
      ]);
      result.current.setCurrentMatchIndex(0);
    });

    act(() => result.current.goToNextMatch());
    expect(result.current.currentMatchIndex).toBe(1);

    act(() => result.current.goToPrevMatch());
    expect(result.current.currentMatchIndex).toBe(0);

    // Test wrap-around from beginning to end
    act(() => result.current.goToPrevMatch());
    expect(result.current.currentMatchIndex).toBe(2);

    // Test wrap-around from end to beginning
    act(() => result.current.goToNextMatch());
    expect(result.current.currentMatchIndex).toBe(0);
  });
});

describe('useProjectViewHooks - Export Functionality', () => {
  /**
   * Tests the successful export of coded segments to an Excel file, ensuring the
   * correct API is called and a download is triggered.
   */
  it('should export coded segments to Excel successfully', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const mockBlob = new Blob(['test data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/export-coded-segments`).reply(200, mockBlob, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Mock the anchor element used for downloading
    const mockLink = document.createElement('a');
    mockLink.setAttribute = vi.fn();
    mockLink.click = vi.fn();
    const originalCreateElement = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return mockLink;
      return originalCreateElement.call(document, tag);
    });

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleExportToExcel();
    });

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'Test Project_coded_segments.xlsx');
    expect(mockLink.click).toHaveBeenCalled();
    expect(result.current.error).toBe('');
  });

  /**
   * Ensures that attempting an export without a loaded project shows an error modal.
   */
  it('should handle export error when no project is loaded', async () => {
    const customWrapper = ({ children }) => (
      <ProjectContext.Provider value={{ projectId: null, selectedFileId: null }}>
        <MemoryRouter>{children}</MemoryRouter>
      </ProjectContext.Provider>
    );

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: customWrapper });

    await act(async () => {
      await result.current.handleExportToExcel();
    });

    expect(result.current.confirmModalData.message).toContain('Please load a project before exporting.');
  });

  /**
   * Tests the successful export of memos to an Excel file.
   */
  it('should export memos successfully', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const mockBlob = new Blob(['memo data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/export-memos`).reply(200, mockBlob, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const mockLink = document.createElement('a');
    mockLink.setAttribute = vi.fn();
    mockLink.click = vi.fn();
    const originalCreateElement = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return mockLink;
      return originalCreateElement.call(document, tag);
    });

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleExportMemos();
    });

    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'Test Project_memos.xlsx');
    expect(mockLink.click).toHaveBeenCalled();
  });

  /**
   * Verifies that an API error during memo export triggers an error modal.
   */
  it('should handle export memos error', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/export-memos`).reply(500, { message: 'Export failed' });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleExportMemos();
    });

    expect(result.current.showConfirmModal).toBe(true);
    expect(result.current.confirmModalData.title).toBe('Export Error');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

describe('useProjectViewHooks - UI State Management', () => {
  /**
   * Tests that the accordion-like functionality for code groups works as expected.
   */
  it('should toggle code groups correctly', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.toggleCodeGroup('Important'));
    expect(result.current.expandedCodes.Important).toBe(true);

    act(() => result.current.toggleCodeGroup('Important'));
    expect(result.current.expandedCodes.Important).toBe(false);
  });

  /**
   * Tests that the accordion-like functionality for memo groups works as expected.
   */
  it('should toggle memo groups correctly', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.toggleMemoGroup('memo-1'));
    expect(result.current.expandedMemos['memo-1']).toBe(true);

    act(() => result.current.toggleMemoGroup('memo-1'));
    expect(result.current.expandedMemos['memo-1']).toBe(false);
  });

  /**
   * Verifies that setting the active coded segment ID updates the state. This is
   * used for highlighting the active segment in the UI.
   */
  it('should set active coded segment id', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setActiveCodedSegmentId('segment-1'));
    expect(result.current.activeCodedSegmentId).toBe('segment-1');
  });

  /**
   * Verifies that setting the active memo ID updates the state.
   */
  it('should set active memo id', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setActiveMemoId('memo-1'));
    expect(result.current.activeMemoId).toBe('memo-1');
  });

  /**
   * Tests that closing the 'Define Code' modal resets its associated state.
   */
  it('should handle define code modal close', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Set initial state for the modal
    act(() => {
      result.current.setShowDefineCodeModal(true);
      result.current.setCodeDefinitionToEdit({ id: 'test' });
    });

    act(() => result.current.handleDefineCodeModalClose());
    expect(result.current.showDefineCodeModal).toBe(false);
    expect(result.current.codeDefinitionToEdit).toBe(null);
  });
});

describe('useProjectViewHooks - Selection and Text Processing', () => {
  /**
   * Verifies that a mouse-up event with a text selection correctly captures
   * the selection info and shows the floating toolbar.
   */
  it('should handle viewer mouse up with text selection', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.selectedFileId).toBe('file-1'));

    // Setup mock DOM environment
    const contentContainer = document.createElement('div');
    const textNode = document.createTextNode(mockProject.importedFiles[0].content);
    contentContainer.appendChild(textNode);
    act(() => {
      result.current.viewerRef.current = contentContainer;
      contentContainer.contains = vi.fn(() => true);
    });

    // Simulate a text selection
    mockSelection.toString.mockReturnValue('multiple sentences');
    mockSelection.rangeCount = 1;
    mockSelection.anchorNode = textNode;
    mockRange.commonAncestorContainer = contentContainer;
    mockRange.startContainer = textNode;
    mockRange.endContainer = textNode;
    mockRange.startOffset = 40;
    mockRange.endOffset = 58;

    vi.spyOn(document, 'createTreeWalker').mockImplementation(() => ({
      nextNode: vi.fn().mockReturnValueOnce(textNode).mockReturnValueOnce(null),
    }));

    await act(async () => {
      await result.current.handleViewerMouseUp();
    });

    expect(result.current.showFloatingToolbar).toBe(true);
    expect(result.current.currentSelectionRange).toEqual(mockRange);
  });

  /**
   * Ensures that attempting to perform a code action without a valid text selection
   * results in an error modal.
   */
  it('should handle code selection action without a selection', async () => {
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });

    // Mock getSelectionInfo to return null, simulating no selection
    const mockGetSelectionInfo = vi.fn(() => null);
    result.current.getSelectionInfo = mockGetSelectionInfo;

    await act(async () => {
      await result.current.handleCodeSelectionAction();
    });

    expect(result.current.showConfirmModal).toBe(true);
    expect(result.current.confirmModalData.title).toBe('Code Error');
  });

  /**
   * Tests the utility function for creating a DOM Range object from character offsets,
   * which is crucial for highlighting and other text-based operations.
   */
  it('should create range from offsets correctly', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Setup a mock DOM structure to traverse
    const mockContainer = document.createElement('div');
    const mockTextNode = document.createTextNode('test content');
    mockContainer.appendChild(mockTextNode);

    vi.spyOn(document, 'createTreeWalker').mockImplementation(() => ({
      nextNode: vi.fn()
        .mockReturnValueOnce(mockTextNode)
        .mockReturnValueOnce(null)
    }));

    const range = result.current.createRangeFromOffsets(mockContainer, 0, 4);

    expect(range).toBeDefined();
    expect(mockRange.setStart).toHaveBeenCalledWith(mockTextNode, 0);
    expect(mockRange.setEnd).toHaveBeenCalledWith(mockTextNode, 4);
  });
});

describe('useProjectViewHooks - Computed Values', () => {
  /**
   * Verifies that the `groupedCodedSegments` memoized value correctly groups
   * segments by their code definition.
   */
  it('should compute grouped coded segments correctly', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.groupedCodedSegments).toHaveLength(1);
    expect(result.current.groupedCodedSegments[0]).toEqual({
      name: 'Important',
      color: '#FF0000',
      segments: [mockProject.codedSegments[0]]
    });
  });

  /**
   * Verifies that the `groupedMemos` memoized value correctly processes memos,
   * determining their display title and type.
   */
  it('should compute grouped memos correctly', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.groupedMemos).toHaveLength(1);
    expect(result.current.groupedMemos[0].displayTitle).toBe('Test Memo');
    expect(result.current.groupedMemos[0].isSegmentMemo).toBe(true);
  });

  /**
   * Tests an edge case where a memo has no title, ensuring a fallback
   * display title is generated from its content.
   */
  it('should handle memos without titles', async () => {
    const projectWithUntitledMemo = {
      ...mockProject,
      memos: [{
        _id: 'memo-2',
        fileId: 'file-1',
        title: '',
        content: 'Memo content',
        text: 'this is a longer text for memo testing',
        startIndex: 60,
        endIndex: 96,
        author: 'test-user',
        authorId: 'user-1'
      }]
    };

    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, projectWithUntitledMemo);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.groupedMemos[0].displayTitle).toBe('Memo on "this is a longer text for memo..."');
  });
});

describe('useProjectViewHooks - Error Handling', () => {
  /**
   * Verifies that network errors during the initial fetch are caught and
   * result in a user-friendly error state.
   */
  it('should handle network errors gracefully on initial fetch', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).networkError();
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to load project');
  });

  /**
   * Ensures that attempting to "upload" with no files selected does not
   * trigger an API call.
   */
  it('should handle invalid file upload (no files)', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const mockEvent = { target: { files: [] } };
    await act(async () => {
      await result.current.handleFileChange(mockEvent);
    });

    expect(mockAxios.history.post.filter(req => req.url.includes('/import/'))).toHaveLength(0);
  });

  /**
   * Tests that if a delete operation fails at the API level, an error state
   * is set correctly.
   */
  it('should handle delete operations with API errors', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    mockAxios.onDelete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/memos/memo-1`).reply(500, { message: 'Delete failed' });
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleDeleteMemo('memo-1', 'Test Memo'));
    await act(async () => {
      await result.current.confirmModalData.onConfirm();
    });

    expect(result.current.error).toBe('Failed to delete memo');
    expect(result.current.showConfirmModal).toBe(false);
  });
});

describe('useProjectViewHooks - Edge Cases', () => {
  /**
   * Verifies that the hook behaves correctly when the API returns a project
   * with no files or other data.
   */
  it('should handle an empty project from the API', async () => {
    const emptyProject = {
      _id: 'test-project-id', name: 'Empty Project', importedFiles: [],
      codedSegments: [], inlineHighlights: [], codeDefinitions: [], memos: []
    };
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, emptyProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.project).toEqual(emptyProject);
    expect(result.current.selectedContent).toBe('');
    expect(result.current.selectedFileName).toBe('');
    expect(result.current.selectedFileId).toBe(null);
  });

  /**
   * Tests that the selection logic doesn't fail if the content viewer reference
   * is not available for some reason.
   */
  it('should handle selection with no viewer ref', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockSelection.toString.mockReturnValue('selected text');
    mockSelection.rangeCount = 1;
    mockSelection.getRangeAt.mockReturnValue(mockRange);

    act(() => {
      result.current.viewerRef.current = null;
    });

    const selectionInfo = result.current.getSelectionInfo();
    expect(selectionInfo).toBe(null);
  });

  /**
   * Ensures that mouse up events are ignored if no file is currently selected.
   */
  it('should handle mouse up without a selected file', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Explicitly set file ID to null to enforce test condition
    act(() => {
      result.current.setSelectedFileId(null);
    });

    mockSelection.toString.mockReturnValue('selected text');
    act(() => result.current.handleViewerMouseUp());
    expect(result.current.showFloatingToolbar).toBe(false);
  });

  /**
   * Verifies that the search function returns no matches when the content is empty.
   */
  it('should handle search with empty content', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSelectedContent('');
      result.current.handleViewerSearchChange({ target: { value: 'test' } });
    });

    expect(result.current.viewerSearchMatches).toEqual([]);
    expect(result.current.currentMatchIndex).toBe(-1);
  });

  /**
   * Ensures that attempting to navigate through search matches when there are
   * none does not cause an error.
   */
  it('should handle navigation with empty search matches', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setViewerSearchMatches([]);
      result.current.setCurrentMatchIndex(-1);
    });

    act(() => result.current.goToNextMatch());
    expect(result.current.currentMatchIndex).toBe(-1);

    act(() => result.current.goToPrevMatch());
    expect(result.current.currentMatchIndex).toBe(-1);
  });
});

describe('useProjectViewHooks - Local Storage Integration', () => {
  /**
   * Verifies that user data (token, ID, username) from localStorage is correctly
   * included in API requests.
   */
  it('should use localStorage values in API calls', async () => {
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    mockAxios.onPost(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/memos`).reply(200, { project: mockProject });
    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSaveMemo({ title: 'New Memo', content: 'New memo content' });
    });

    const memoRequest = mockAxios.history.post.find(req => req.url.includes('/memos'));
    const requestData = JSON.parse(memoRequest.data);

    expect(requestData.author).toBe('mock-username');
    expect(requestData.authorId).toBe('mock-user-id');
    expect(memoRequest.headers.Authorization).toBe('Bearer mock-token');
  });

  /**
   * Tests the fallback behavior when user data is not present in localStorage,
   * ensuring API calls still proceed with default/anonymous values.
   */
  it('should handle missing localStorage values gracefully', async () => {
    mockLocalStorage.getItem.mockImplementation(() => null);
    mockAxios.onGet(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id`).reply(200, mockProject);
    mockAxios.onPost(`${import.meta.env.VITE_BACKEND_URL}/api/projects/test-project-id/memos`).reply(200, { project: mockProject });

    const { result } = renderHook(() => useProjectViewHooks(), { wrapper: wrapperWithRouter });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSaveMemo({ title: 'New Memo', content: 'New memo content' });
    });

    const memoRequest = mockAxios.history.post.find(req => req.url.includes('/memos'));
    const requestData = JSON.parse(memoRequest.data);

    expect(requestData.author).toBe('Anonymous');
    expect(requestData.authorId).toBeDefined();
    expect(memoRequest.headers.Authorization).toBe('Bearer null');
  });
});
