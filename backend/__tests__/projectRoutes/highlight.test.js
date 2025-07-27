/**
 * @file Integration tests for the Highlight API endpoints.
 * @description This file tests the creation, deletion, and bulk deletion of
 * inline highlights within a project, including authorization and ownership checks.
 */

// --- CORE DEPENDENCIES ---
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// --- APPLICATION MODULES ---
import app from '../../src/server.js';
import Project from '../../src/models/Project.js';
import User from '../../src/models/Users.js';

// --- TEST UTILITIES ---
import * as db from '../db.setup.js';

// --- ENVIRONMENT CONFIGURATION ---
dotenv.config();

/**
 * Test suite for the Highlight API.
 */
describe('Highlight API', () => {
  // --- TEST CONTEXT VARIABLES ---
  // Store stateful data (IDs, tokens) for use across tests in this suite.
  let token;
  let anotherToken;
  let projectId;
  let fileId;
  let highlightId;
  let highlightId2;
  let highlightId3;

  // --- TEST LIFECYCLE HOOKS ---

  /**
   * Connect to the in-memory database before any tests run.
   */
  beforeAll(db.connect);

  /**
   * Clear all test data after each test to ensure test isolation.
   */
  afterEach(db.clearDatabase);

  /**
   * Close the database connection after all tests have completed.
   */
  afterAll(db.closeDatabase);

  /**
   * Before each test, seed the database with a consistent dataset.
   * This includes two users (for auth testing), a project, a file,
   * and multiple highlights to test both single and bulk operations.
   */
  beforeEach(async () => {
    // 1. Create two distinct users to test ownership rules.
    const user = await User.create({ name: 'Test User', email: 'test@example.com', password: 'password123' });
    const anotherUser = await User.create({ name: 'Another User', email: 'another@example.com', password: 'password123' });

    // 2. Generate JWTs for both users.
    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    anotherToken = jwt.sign({ id: anotherUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 3. Create a project with a file and multiple pre-existing highlights.
    const project = await Project.create({
      name: 'Highlight Test Project',
      owner: user._id,
      importedFiles: [{ name: 'highlight-file.txt', content: 'This is some text to be highlighted for various tests.' }],
      inlineHighlights: [
        { fileId: new mongoose.Types.ObjectId(), fileName: 'highlight-file.txt', text: 'existing highlight 1', color: '#FF0000', startIndex: 0, endIndex: 10 },
        { fileId: new mongoose.Types.ObjectId(), fileName: 'highlight-file.txt', text: 'existing highlight 2', color: '#00FF00', startIndex: 11, endIndex: 21 },
        { fileId: new mongoose.Types.ObjectId(), fileName: 'highlight-file.txt', text: 'existing highlight 3', color: '#0000FF', startIndex: 22, endIndex: 32 },
      ],
    });

    // 4. Store IDs from the created documents for use in tests.
    projectId = project._id;
    fileId = project.importedFiles[0]._id;
    highlightId = project.inlineHighlights[0]._id;
    highlightId2 = project.inlineHighlights[1]._id;
    highlightId3 = project.inlineHighlights[2]._id;

    // 5. Correctly associate the pre-existing highlights with the actual fileId.
    project.inlineHighlights.forEach(h => h.fileId = fileId);
    await project.save();
  });

  // --- TEST CASES ---

  /**
   * Test suite for POST /api/projects/:projectId/highlight
   * Tests the creation of new highlights.
   */
  describe('POST /api/projects/:projectId/highlight', () => {
    it('should return 200 and the updated project when a highlight is created successfully', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/highlight`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileId: fileId,
          fileName: 'highlight-file.txt',
          text: 'a new highlight',
          color: '#FFFF00',
          startIndex: 33,
          endIndex: 48,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.project.inlineHighlights).toHaveLength(4);
      expect(res.body.project.inlineHighlights[3].text).toBe('a new highlight');
    });

    it('should return 200 and a null project if another user tries to create a highlight', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/highlight`)
        .set('Authorization', `Bearer ${anotherToken}`) // Use another user's token.
        .send({
          fileId: fileId,
          fileName: 'highlight-file.txt',
          text: 'unauthorized highlight',
          color: '#0000FF',
          startIndex: 0,
          endIndex: 10,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.project).toBeNull();

      // Verify the highlight was not actually added to the database.
      const project = await Project.findById(projectId);
      expect(project.inlineHighlights).toHaveLength(3);
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/highlight`)
        .send({ text: 'no auth highlight' });

      expect(res.statusCode).toBe(401);
    });
  });

  /**
   * Test suite for DELETE /api/projects/:projectId/highlight/:highlightId
   * Tests the deletion of a single highlight.
   */
  describe('DELETE /api/projects/:projectId/highlight/:highlightId', () => {
    it('should return 200 and the updated project when a highlight is deleted successfully', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/highlight/${highlightId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Highlight deleted');
      expect(res.body.project.inlineHighlights).toHaveLength(2);

      // For robustness, verify the change directly in the database.
      const projectAfterDelete = await Project.findById(projectId);
      expect(projectAfterDelete.inlineHighlights).toHaveLength(2);
    });

    it('should return 200 but not change the project if the highlightId is invalid', async () => {
      const fakeHighlightId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/projects/${projectId}/highlight/${fakeHighlightId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.project.inlineHighlights).toHaveLength(3);
    });

    it('should return 200 and a null project if another user tries to delete a highlight', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/highlight/${highlightId}`)
        .set('Authorization', `Bearer ${anotherToken}`); // Use another user's token.

      expect(res.statusCode).toBe(200);
      expect(res.body.project).toBeNull();

      // Verify the highlight was NOT deleted from the database.
      const projectAfterAttempt = await Project.findById(projectId);
      expect(projectAfterAttempt.inlineHighlights).toHaveLength(3);
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app).delete(`/api/projects/${projectId}/highlight/${highlightId}`);
      expect(res.statusCode).toBe(401);
    });
  });

  /**
   * Test suite for POST /api/projects/:projectId/highlight/delete-bulk
   * Tests the bulk deletion of multiple highlights.
   */
  describe('POST /api/projects/:projectId/highlight/delete-bulk', () => {
    it('should return 200 and delete multiple highlights successfully', async () => {
      const idsToDelete = [highlightId, highlightId3];
      const res = await request(app)
        .post(`/api/projects/${projectId}/highlight/delete-bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: idsToDelete });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(`${idsToDelete.length} highlights deleted`);
      expect(res.body.project.inlineHighlights).toHaveLength(1);

      // Verify the correct highlight remains.
      expect(res.body.project.inlineHighlights[0]._id.toString()).toBe(highlightId2.toString());
    });

    it('should return 404 if another user tries to bulk delete', async () => {
      const idsToDelete = [highlightId, highlightId2];
      const res = await request(app)
        .post(`/api/projects/${projectId}/highlight/delete-bulk`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({ ids: idsToDelete });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found');

      // Verify no highlights were deleted.
      const project = await Project.findById(projectId);
      expect(project.inlineHighlights).toHaveLength(3);
    });

    it('should return 400 if the "ids" field is not a valid array', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/highlight/delete-bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: 'not-an-array' }); // Invalid payload

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Invalid request: "ids" array is required.');
    });

    it('should return 400 if the "ids" field is missing', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/highlight/delete-bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({ someOtherKey: 'value' }); // Missing 'ids' key

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Invalid request: "ids" array is required.');
    });

    it('should correctly delete only the valid IDs when the array contains non-existent IDs', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const idsToDelete = [highlightId, nonExistentId];

      const res = await request(app)
        .post(`/api/projects/${projectId}/highlight/delete-bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: idsToDelete });

      expect(res.statusCode).toBe(200);
      // The backend logic attempts to pull all specified IDs.
      expect(res.body.message).toBe(`${idsToDelete.length} highlights deleted`);
      // Only one highlight should have been actually removed.
      expect(res.body.project.inlineHighlights).toHaveLength(2);

      const projectAfterDelete = await Project.findById(projectId);
      const remainingIds = projectAfterDelete.inlineHighlights.map(h => h._id.toString());
      expect(remainingIds).not.toContain(highlightId.toString());
      expect(remainingIds).toContain(highlightId2.toString());
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/highlight/delete-bulk`)
        .send({ ids: [highlightId] });

      expect(res.statusCode).toBe(401);
    });
  });
});
