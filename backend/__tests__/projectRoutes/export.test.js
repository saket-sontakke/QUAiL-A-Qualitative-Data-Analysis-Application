/**
 * @file Integration tests for the data export API endpoints.
 * @description This file tests the functionality for exporting project data,
 * such as coded segments and memos, into Excel format. It also verifies
 * authorization and ownership checks.
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
 * Test suite for the Export API.
 */
describe('Export API', () => {
  // --- TEST CONTEXT VARIABLES ---
  // Store tokens and IDs for use across different tests in this suite.
  let ownerToken;
  let anotherUserToken;
  let ownerId;
  let projectId;
  const projectName = 'Export Test Project';

  // --- TEST LIFECYCLE HOOKS ---

  /**
   * Connect to the in-memory database before any tests run.
   */
  beforeAll(db.connect);

  /**
   * Clear all test data after each test to ensure isolation.
   */
  afterEach(db.clearDatabase);

  /**
   * Close the database connection after all tests have completed.
   */
  afterAll(db.closeDatabase);

  /**
   * Before each test, seed the database with a consistent and rich dataset.
   * This includes two users (an owner and another user) and a project
   * with sample data to ensure export functionality can be thoroughly tested.
   */
  beforeEach(async () => {
    // 1. Create two distinct users to test ownership and authorization.
    const owner = await User.create({
      name: 'Test Owner',
      email: 'owner@example.com',
      password: 'password123',
    });
    ownerId = owner._id;

    const anotherUser = await User.create({
      name: 'Another User',
      email: 'another@example.com',
      password: 'password123',
    });

    // 2. Generate JWTs for both users.
    ownerToken = jwt.sign({ id: owner._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    anotherUserToken = jwt.sign({ id: anotherUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 3. Create a project with comprehensive data for export.
    const project = await Project.create({
      name: projectName,
      owner: ownerId,
      codeDefinitions: [
        { name: 'Positive Sentiment', description: 'Instances of positive feedback.', color: '#4CAF50', owner: ownerId },
        { name: 'Negative Sentiment', description: 'Instances of negative feedback.', color: '#F44336', owner: ownerId },
      ],
      codedSegments: [
        {
          fileId: new mongoose.Types.ObjectId(),
          fileName: 'interview_01.txt',
          text: 'I really love the new feature.',
          codeDefinition: { _id: new mongoose.Types.ObjectId(), name: 'Positive Sentiment', color: '#4CAF50' },
          startIndex: 10,
          endIndex: 35,
        },
        {
          fileId: new mongoose.Types.ObjectId(),
          fileName: 'interview_01.txt',
          text: 'The user interface is confusing.',
          codeDefinition: { _id: new mongoose.Types.ObjectId(), name: 'Negative Sentiment', color: '#F44336' },
          startIndex: 50,
          endIndex: 82,
        },
      ],
      memos: [
        {
          fileId: new mongoose.Types.ObjectId(),
          fileName: 'observation_notes.txt',
          title: 'Initial Thoughts',
          content: 'The project is off to a good start.',
          author: owner.name,
          authorId: owner._id,
          text: 'good start',
          startIndex: 30,
          endIndex: 40,
        },
      ],
    });
    projectId = project._id;
  });

  // --- TEST CASES ---

  /**
   * Test suite for GET /api/projects/:projectId/export-coded-segments
   */
  describe('GET /api/projects/:projectId/export-coded-segments', () => {
    it('should return 200 and an Excel file for the project owner', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/export-coded-segments`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toBe(`attachment; filename="${projectName}_coded_segments.xlsx"`);
    });

    it('should return 404 when a non-owner tries to export', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/export-coded-segments`)
        .set('Authorization', `Bearer ${anotherUserToken}`); // Use other user's token

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found or unauthorized');
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app).get(`/api/projects/${projectId}/export-coded-segments`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for a non-existent project ID', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/projects/${fakeProjectId}/export-coded-segments`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  /**
   * Test suite for GET /api/projects/:projectId/export-memos
   */
  describe('GET /api/projects/:projectId/export-memos', () => {
    it('should return 200 and an Excel file for the project owner', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/export-memos`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toBe('attachment; filename=memos.xlsx');
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app).get(`/api/projects/${projectId}/export-memos`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for a non-existent project ID', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/projects/${fakeProjectId}/export-memos`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });
  });
});
