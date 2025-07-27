/**
 * @file Integration tests for the Coded Segment API endpoints.
 * @description This file contains tests for creating and deleting coded segments
 * within a project, ensuring proper authorization and data handling.
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
 * Test suite for the Coded Segment API.
 */
describe('Coded Segment API', () => {
  // --- TEST CONTEXT VARIABLES ---
  // These variables store stateful data (IDs, tokens) for use across tests.
  let token;
  let userId;
  let projectId;
  let fileId;
  let codeDefId;
  let codedSegmentId;

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
   * Before each test, seed the database with a consistent set of data.
   * This includes a user, a project, an imported file, a code definition,
   * and a pre-existing coded segment to ensure a predictable state for testing.
   */
  beforeEach(async () => {
    // 1. Create a user.
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });
    userId = user._id;

    // 2. Generate a JWT for authenticating API requests.
    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // 3. Create a project with all necessary subdocuments for testing.
    const project = await Project.create({
      name: 'Test Project',
      owner: user._id,
      importedFiles: [{ name: 'test-file.txt', content: 'Some text to be coded.' }],
      codeDefinitions: [
        {
          name: 'Test Code',
          description: 'A definition for testing.',
          color: '#FF0000',
          owner: user._id,
        },
      ],
      codedSegments: [
        {
          fileId: new mongoose.Types.ObjectId(), // Temporary placeholder
          fileName: 'test-file.txt',
          text: 'existing segment',
          startIndex: 0,
          endIndex: 10,
          codeDefinition: {
            _id: new mongoose.Types.ObjectId(), // Temporary placeholder
            name: 'Test Code',
          },
        },
      ],
    });

    // 4. Extract and store IDs from the created documents for use in tests.
    projectId = project._id;
    fileId = project.importedFiles[0]._id;
    codeDefId = project.codeDefinitions[0]._id;
    codedSegmentId = project.codedSegments[0]._id;

    // 5. Correctly associate the pre-existing coded segment with the actual file ID.
    project.codedSegments[0].fileId = fileId;
    await project.save();
  });

  // --- TEST CASES ---

  /**
   * Test suite for POST /api/projects/:projectId/code
   *
   * Tests the creation of new coded segments.
   */
  describe('POST /api/projects/:projectId/code', () => {
    it('should return 200 and the updated project when a coded segment is created successfully', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/code`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileId: fileId,
          fileName: 'test-file.txt',
          text: 'This is a new segment.',
          codeDefinitionId: codeDefId,
          startIndex: 0,
          endIndex: 23,
        });

      expect(res.statusCode).toBe(200);
      // The project should now have two segments: the initial one plus the new one.
      expect(res.body.project.codedSegments).toHaveLength(2);
      expect(res.body.project.codedSegments[1].text).toBe('This is a new segment.');
      expect(String(res.body.project.codedSegments[1].codeDefinition._id)).toBe(String(codeDefId));
    });

    it('should return 400 if the provided code definition ID is not found in the project', async () => {
      const fakeCodeDefId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/projects/${projectId}/code`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileId: fileId,
          fileName: 'test-file.txt',
          text: 'This should fail.',
          codeDefinitionId: fakeCodeDefId, // This ID does not exist in the project.
          startIndex: 0,
          endIndex: 10,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Code definition not found');
    });

    it('should return 404 if the project ID does not exist', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/projects/${fakeProjectId}/code`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileId: fileId,
          fileName: 'test-file.txt',
          text: 'This should fail.',
          codeDefinitionId: codeDefId,
          startIndex: 0,
          endIndex: 10,
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/code`)
        .send({
          text: 'Unauthorized segment.',
          codeDefinitionId: codeDefId,
        });

      expect(res.statusCode).toBe(401);
    });
  });

  /**
   * Test suite for DELETE /api/projects/:projectId/code/:codeId
   *
   * Tests the deletion of existing coded segments.
   */
  describe('DELETE /api/projects/:projectId/code/:codeId', () => {
    it('should return 200 and the updated project when a coded segment is deleted successfully', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/code/${codedSegmentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Segment deleted');
      expect(res.body.project.codedSegments).toHaveLength(0);

      // For robustness, double-check the database state directly.
      const projectAfterDelete = await Project.findById(projectId);
      expect(projectAfterDelete.codedSegments).toHaveLength(0);
    });

    it('should return 200 but not change the project if the segment ID is invalid', async () => {
      const fakeCodeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/projects/${projectId}/code/${fakeCodeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      // The operation should not throw an error but should not find and delete anything.
      expect(res.body.project.codedSegments).toHaveLength(1);
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app).delete(`/api/projects/${projectId}/code/${codedSegmentId}`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 200 and null project when a user tries to delete a segment from a project they do not own', async () => {
      // Setup a second user and token to simulate an unauthorized action.
      const anotherUser = await User.create({
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123',
      });
      const anotherToken = jwt.sign({ id: anotherUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const res = await request(app)
        .delete(`/api/projects/${projectId}/code/${codedSegmentId}`)
        .set('Authorization', `Bearer ${anotherToken}`); // Use the other user's token.

      // The backend query includes the user ID, so it won't find a matching document.
      // The controller returns the result of the query, which is null.
      expect(res.statusCode).toBe(200);
      expect(res.body.project).toBeNull();

      // Verify the segment was NOT actually deleted from the database.
      const projectAfterAttempt = await Project.findById(projectId);
      expect(projectAfterAttempt.codedSegments).toHaveLength(1);
    });
  });
});
