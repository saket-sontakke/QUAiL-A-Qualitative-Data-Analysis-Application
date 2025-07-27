/**
 * @file Integration tests for the Code Definition API endpoints.
 * @description This file tests the creation, updating, and deletion of code
 * definitions associated with a project.
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
 * Test suite for the Code Definition API.
 */
describe('Code Definition API', () => {
  // --- TEST CONTEXT VARIABLES ---
  // These variables store stateful data (IDs, tokens) across tests within this suite.
  let token;
  let userId;
  let projectId;
  let codeDefId;

  // --- TEST LIFECYCLE HOOKS ---

  /**
   * Connect to the in-memory database before any tests run.
   */
  beforeAll(db.connect);

  /**
   * Clear all test data after each test to ensure a clean slate.
   */
  afterEach(db.clearDatabase);

  /**
   * Close the database connection after all tests have completed.
   */
  afterAll(db.closeDatabase);

  /**
   * Before each test, seed the database with a standard set of data:
   * a user, a project, and an initial code definition. This ensures
   * a consistent state for each test case.
   */
  beforeEach(async () => {
    // Create a fresh user for each test.
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });
    userId = user._id;

    // Create a project owned by the user with one pre-existing code definition.
    const project = await Project.create({
      name: 'Test Project',
      owner: user._id,
      codeDefinitions: [
        {
          name: 'Initial Code',
          description: 'An existing code.',
          color: '#000000',
          owner: user._id,
        },
      ],
    });

    // Generate a JWT for authenticating API requests.
    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // Store the IDs for use in test cases.
    projectId = project._id;
    codeDefId = project.codeDefinitions[0]._id;
  });

  // --- TEST CASES ---

  /**
   * Test suite for POST /api/projects/:projectId/code-definitions
   *
   * Tests the creation of new code definitions.
   */
  describe('POST /api/projects/:projectId/code-definitions', () => {
    it('should return 201 and the updated project when a new code definition is created successfully', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/code-definitions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Positive Sentiment',
          description: 'Comments that show a positive outlook.',
          color: '#81C784',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.codeDefinitions).toHaveLength(2);
      expect(res.body.codeDefinitions[1].name).toBe('Positive Sentiment');
    });

    it('should return 400 if the code definition name is missing', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/code-definitions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'A description without a name.',
          color: '#E57373',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Code definition name is required.');
    });

    it('should return 400 for a duplicate code definition name within the same project', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/code-definitions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Initial Code', // This name already exists via beforeEach setup.
          description: 'A duplicate code.',
          color: '#FFFFFF',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Code definition already exists');
    });

    it('should return 404 if the project ID does not exist', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/projects/${fakeProjectId}/code-definitions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Valid Name',
          description: 'A valid description.',
          color: '#FFFFFF',
        });

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/code-definitions`)
        .send({
          name: 'Unauthorized Code',
          color: '#E57373',
        });

      expect(res.statusCode).toBe(401);
    });
  });

  /**
   * Test suite for PUT /api/projects/:projectId/code-definitions/:codeDefId
   *
   * Tests the updating of existing code definitions.
   */
  describe('PUT /api/projects/:projectId/code-definitions/:codeDefId', () => {
    it('should return 200 and the updated definition on a successful update', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}/code-definitions/${codeDefId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
          description: 'This is an updated description.',
          color: '#123456',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.codeDefinition.name).toBe('Updated Name');
      expect(res.body.codeDefinition.color).toBe('#123456');
    });

    it('should return 404 if the code definition ID is not found', async () => {
      const fakeCodeDefId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/projects/${projectId}/code-definitions/${fakeCodeDefId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Code definition not found');
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}/code-definitions/${codeDefId}`)
        .send({ name: 'New Name' });

      expect(res.statusCode).toBe(401);
    });
  });

  /**
   * Test suite for DELETE /api/projects/:projectId/code-definitions/:codeDefId
   *
   * Tests the deletion of existing code definitions.
   */
  describe('DELETE /api/projects/:projectId/code-definitions/:codeDefId', () => {
    it('should return 200 and a confirmation message on successful deletion', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/code-definitions/${codeDefId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Code definition deleted');
      // Verify the subdocument was actually removed from the project.
      expect(res.body.project.codeDefinitions).toHaveLength(0);
    });

    it('should return 404 if the project is not found', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/projects/${fakeProjectId}/code-definitions/${codeDefId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/code-definitions/${codeDefId}`);

      expect(res.statusCode).toBe(401);
    });
  });
});
