/**
 * @file Integration tests for the Memo API endpoints.
 * @description This file contains tests for creating, updating, and deleting memos
 * associated with a project, including checks for authorization and ownership.
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
 * Test suite for the Memo API.
 */
describe('Memo API', () => {
  // --- TEST CONTEXT VARIABLES ---
  // These variables store stateful data (IDs, tokens) for use across tests.
  let token;
  let anotherToken;
  let userId;
  let projectId;
  let fileId;
  let memoId;

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
   * and a pre-existing memo to ensure a predictable state for each test case.
   */
  beforeEach(async () => {
    // 1. Create two distinct users to test ownership and authorization rules.
    const user = await User.create({ name: 'Test User', email: 'test@example.com', password: 'password123' });
    userId = user._id;
    const anotherUser = await User.create({ name: 'Another User', email: 'another@example.com', password: 'password123' });

    // 2. Generate JWTs for both users.
    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    anotherToken = jwt.sign({ id: anotherUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 3. Create a project with a file and a pre-existing memo.
    const project = await Project.create({
      name: 'Memo Test Project',
      owner: user._id,
      importedFiles: [{ name: 'memo-file.txt', content: 'This is some text for memos.' }],
      memos: [{
        fileId: new mongoose.Types.ObjectId(), // Placeholder, corrected below
        fileName: 'memo-file.txt',
        title: 'Initial Memo',
        content: 'This is an existing memo.',
        author: user.name,
        authorId: user._id,
        text: 'some text for memos',
        startIndex: 13,
        endIndex: 28,
      }],
    });

    // 4. Store IDs from the created documents for use in tests.
    projectId = project._id;
    fileId = project.importedFiles[0]._id;
    memoId = project.memos[0]._id;

    // 5. Correctly associate the pre-existing memo with the actual fileId.
    project.memos[0].fileId = fileId;
    await project.save();
  });

  // --- TEST CASES ---

  /**
   * Test suite for POST /api/projects/:projectId/memos
   * Tests the creation of new memos.
   */
  describe('POST /api/projects/:projectId/memos', () => {
    it('should return 201 and the new memo when created successfully', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/memos`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileId: fileId,
          fileName: 'memo-file.txt',
          title: 'New Memo Title',
          content: 'Some new memo content.',
          text: 'some text',
          startIndex: 1,
          endIndex: 10,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.memo.title).toBe('New Memo Title');
      expect(res.body.memo.authorId).toBe(String(userId));
      expect(res.body.project.memos).toHaveLength(2);
    });

    it('should return 404 if the project ID does not exist', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/projects/${fakeProjectId}/memos`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'A memo for a non-existent project' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/memos`)
        .send({ title: 'Unauthorized Memo' });

      expect(res.statusCode).toBe(401);
    });
  });

  /**
   * Test suite for PUT /api/projects/:projectId/memos/:memoId
   * Tests the updating of existing memos.
   */
  describe('PUT /api/projects/:projectId/memos/:memoId', () => {
    it('should return 200 and the updated project when a memo is updated successfully', async () => {
      const updateData = {
        title: 'Updated Memo Title',
        content: 'The content has been updated.',
        text: 'Updated linked text.',
        startIndex: 10,
        endIndex: 30,
      };

      const res = await request(app)
        .put(`/api/projects/${projectId}/memos/${memoId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Memo updated');
      expect(res.body.project).toBeDefined();

      // Find the updated memo in the response to verify its contents.
      const updatedMemo = res.body.project.memos.find(
        (memo) => memo._id.toString() === memoId.toString()
      );

      expect(updatedMemo).toBeDefined();
      expect(updatedMemo.title).toBe('Updated Memo Title');
      expect(updatedMemo.content).toBe('The content has been updated.');
    });

    it('should return 404 if another user tries to update the memo', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}/memos/${memoId}`)
        .set('Authorization', `Bearer ${anotherToken}`) // Use other user's token.
        .send({ title: 'Malicious Update' });

      // The backend query for the project includes the owner ID, so it won't be found.
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });

    it('should return 404 if the memo ID is invalid', async () => {
      const fakeMemoId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/projects/${projectId}/memos/${fakeMemoId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Update for non-existent memo' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Memo not found');
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}/memos/${memoId}`)
        .send({ title: 'Unauthorized Update' });

      expect(res.statusCode).toBe(401);
    });
  });

  /**
   * Test suite for DELETE /api/projects/:projectId/memos/:memoId
   * Tests the deletion of an existing memo.
   */
  describe('DELETE /api/projects/:projectId/memos/:memoId', () => {
    it('should return 200 and the updated project when a memo is deleted successfully', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/memos/${memoId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Memo deleted');
      expect(res.body.project.memos).toHaveLength(0);

      // For robustness, verify the change directly in the database.
      const projectAfterDelete = await Project.findById(projectId);
      expect(projectAfterDelete.memos).toHaveLength(0);
    });

    it('should return 404 if another user tries to delete the memo', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/memos/${memoId}`)
        .set('Authorization', `Bearer ${anotherToken}`); // Use other user's token.

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/memos/${memoId}`);

      expect(res.statusCode).toBe(401);
    });
  });
});
