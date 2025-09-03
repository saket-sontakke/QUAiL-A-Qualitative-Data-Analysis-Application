/**
 * @file Integration tests for file import and deletion API endpoints.
 * @description This file tests the functionality for uploading files (.txt, .docx),
 * processing them, and deleting them along with their associated data. It includes
 * mocking for external dependencies like 'mammoth'.
 */

// --- CORE NODE.JS DEPENDENCIES ---
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- THIRD-PARTY DEPENDENCIES ---
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { jest } from '@jest/globals';

// --- JEST MOCKING ---
// Mock the 'mammoth' library to prevent actual DOCX processing during tests.
// This must be done before the application server is imported.
jest.unstable_mockModule('mammoth', () => ({
  default: {
    extractRawText: jest.fn(),
  },
}));

// --- APPLICATION MODULES ---
// Note: The 'app' server is imported dynamically within beforeAll
// to ensure it loads with the mocked dependencies.
import Project from '../../src/models/Project.js';
import User from '../../src/models/Users.js';

// --- TEST UTILITIES ---
import * as db from '../db.setup.js';

// --- ENVIRONMENT & PATH CONFIGURATION ---
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Use separate test directory to avoid conflicts with production uploads
const testUploadsDir = path.join(__dirname, '../../test_uploads');

/**
 * Test suite for the File Import and Deletion API.
 */
describe('File Import and Delete API', () => {
  // --- TEST CONTEXT VARIABLES ---
  let token;
  let projectId;
  let mammoth;
  let app;

  /**
   * Setup runs once before all tests in this suite.
   * It dynamically imports the app server and the mocked mammoth library,
   * connects to the database, and creates a temporary test uploads directory.
   */
  beforeAll(async () => {
    // Set NODE_ENV to test to ensure test directory usage
    process.env.NODE_ENV = 'test';
    
    // Dynamically import the app *after* mocks are defined. This is crucial.
    app = (await import('../../src/server.js')).default;
    mammoth = (await import('mammoth')).default;

    await db.connect();

    // Create a temporary directory for file uploads if it doesn't exist.
    if (!fs.existsSync(testUploadsDir)) {
      fs.mkdirSync(testUploadsDir, { recursive: true });
    }
  });

  /**
   * Teardown runs once after all tests in this suite have completed.
   * It closes the database connection and removes the temporary test uploads directory.
   */
  afterAll(async () => {
    await db.closeDatabase();
    
    // Clean up test uploads directory
    if (fs.existsSync(testUploadsDir)) {
      fs.rmSync(testUploadsDir, { recursive: true, force: true });
    }
    
    // Reset NODE_ENV
    delete process.env.NODE_ENV;
  });

  /**
   * Runs before each test to set up a consistent state.
   * It creates a user and a project, generates a JWT, and clears any
   * previous mock function calls.
   */
  beforeEach(async () => {
    const user = await User.create({ name: 'Test User', email: 'test@example.com', password: 'password123' });
    const project = await Project.create({ name: 'Test Project', owner: user._id });

    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    projectId = project._id;

    // Clear mock history before each test.
    if (mammoth && mammoth.extractRawText) {
      mammoth.extractRawText.mockClear();
    }
  });

  /**
   * Clears the database after each test to ensure test isolation.
   */
  afterEach(async () => {
    await db.clearDatabase();
    
    // Clean up any test files created during the test
    const textDir = path.join(testUploadsDir, 'text');
    const audioDir = path.join(testUploadsDir, 'audio');
    
    [textDir, audioDir].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        });
      }
    });
  });

  /**
   * Test suite for POST /api/projects/import/:id
   */
  describe('POST /api/projects/import/:id', () => {
    it('should return 200 and import a .txt file successfully', async () => {
      const txtFilePath = path.join(testUploadsDir, 'test.txt');
      fs.writeFileSync(txtFilePath, 'This is a test text file.');

      const res = await request(app)
        .post(`/api/projects/import/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', txtFilePath);

      expect(res.statusCode).toBe(200);
      expect(res.body.project.importedFiles).toHaveLength(1);
      expect(res.body.project.importedFiles[0].name).toBe('test.txt');
      expect(res.body.project.importedFiles[0].content).toBe('This is a test text file.');
    });

    it('should return 200 and import a .docx file using the mocked mammoth extractor', async () => {
      const docxFilePath = path.join(testUploadsDir, 'test.docx');
      fs.writeFileSync(docxFilePath, 'dummy docx content');

      // Mock the return value for the docx text extraction.
      mammoth.extractRawText.mockResolvedValue({ value: 'Extracted text from DOCX.' });

      const res = await request(app)
        .post(`/api/projects/import/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', docxFilePath);

      expect(res.statusCode).toBe(200);
      expect(mammoth.extractRawText).toHaveBeenCalled();
      expect(res.body.project.importedFiles).toHaveLength(1);
      expect(res.body.project.importedFiles[0].content).toBe('Extracted text from DOCX.');
    });

    it('should return 400 if no file is uploaded', async () => {
      const res = await request(app)
        .post(`/api/projects/import/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('No file uploaded');
    });

    it('should return 401 if no authorization token is provided', async () => {
      const txtFilePath = path.join(testUploadsDir, 'unauthorized.txt');
      fs.writeFileSync(txtFilePath, 'content');

      const res = await request(app)
        .post(`/api/projects/import/${projectId}`)
        .attach('file', txtFilePath);

      expect(res.statusCode).toBe(401);
    });
  });

  /**
   * Test suite for DELETE /api/projects/:projectId/files/:fileId
   */
  describe('DELETE /api/projects/:projectId/files/:fileId', () => {
    let fileId;

    /**
     * Before each test in this suite, add a file and a related coded segment
     * to the project to test the cascading delete logic.
     */
    beforeEach(async () => {
      const project = await Project.findById(projectId);
      project.importedFiles.push({ name: 'deletable.txt', content: 'to be deleted' });

      const newFileId = project.importedFiles[0]._id;
      project.codedSegments.push({
        fileId: newFileId,
        fileName: 'deletable.txt',
        text: 'some coded text',
        startIndex: 0,
        endIndex: 10,
        codeDefinition: {
          name: 'test code',
          _id: new mongoose.Types.ObjectId(),
        },
      });

      const updatedProject = await project.save();
      fileId = updatedProject.importedFiles[0]._id;
    });

    it('should return 200 and delete a file and its related data successfully', async () => {
      // Verify initial state.
      const projectBeforeDelete = await Project.findById(projectId);
      expect(projectBeforeDelete.importedFiles).toHaveLength(1);
      expect(projectBeforeDelete.codedSegments).toHaveLength(1);

      // Perform the delete operation.
      const res = await request(app)
        .delete(`/api/projects/${projectId}/files/${fileId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('File and related data deleted successfully');

      // Verify final state from the response.
      expect(res.body.project.importedFiles).toHaveLength(0);
      expect(res.body.project.codedSegments).toHaveLength(0);

      // For robustness, verify final state directly from the database.
      const projectAfterDelete = await Project.findById(projectId);
      expect(projectAfterDelete.importedFiles).toHaveLength(0);
      expect(projectAfterDelete.codedSegments).toHaveLength(0);
    });

    it('should return 404 if the project is not found', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/projects/${fakeProjectId}/files/${fileId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found or you do not have permission');
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app).delete(`/api/projects/${projectId}/files/${fileId}`);

      expect(res.statusCode).toBe(401);
    });
  });
});