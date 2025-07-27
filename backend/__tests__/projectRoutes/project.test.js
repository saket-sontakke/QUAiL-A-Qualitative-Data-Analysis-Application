/**
 * @file Integration tests for the core Project API endpoints.
 * @description This file contains tests for the basic CRUD (Create, Read, Update, Delete)
 * operations on projects, ensuring proper authorization and ownership checks.
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
 * Test suite for the core Project API.
 */
describe('Project API', () => {
  // --- TEST CONTEXT VARIABLES ---
  // Store tokens and IDs for use across different tests in this suite.
  let tokenOne, tokenTwo;
  let userOneId;
  let projectOneId;

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
   * This includes two distinct users and a project owned by the first user,
   * allowing for robust testing of ownership and authorization rules.
   */
  beforeEach(async () => {
    // 1. Create two users to test ownership scenarios.
    const userOne = await User.create({ name: 'User One', email: 'one@example.com', password: 'password123' });
    const userTwo = await User.create({ name: 'User Two', email: 'two@example.com', password: 'password123' });
    userOneId = userOne._id;

    // 2. Create a project owned by User One.
    const projectOne = await Project.create({ name: 'Project One', owner: userOne._id, data: 'Initial data' });
    projectOneId = projectOne._id;

    // 3. Generate JWTs for both users.
    tokenOne = jwt.sign({ id: userOne._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    tokenTwo = jwt.sign({ id: userTwo._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  // --- TEST CASES ---

  /**
   * Test suite for POST /api/projects/create
   */
  describe('POST /api/projects/create', () => {
    it('should return 201 and the new project when created successfully', async () => {
      const res = await request(app)
        .post('/api/projects/create')
        .set('Authorization', `Bearer ${tokenOne}`)
        .send({
          name: 'My New Project',
          data: 'Some project data',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('My New Project');
      expect(res.body.owner).toBe(String(userOneId));
    });

    it('should return 500 if the project name is missing (due to model validation failure)', async () => {
      const res = await request(app)
        .post('/api/projects/create')
        .set('Authorization', `Bearer ${tokenOne}`)
        .send({ data: 'Data without a name' });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Project creation failed');
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app)
        .post('/api/projects/create')
        .send({ name: 'Unauthorized Project' });

      expect(res.statusCode).toBe(401);
    });
  });

  /**
   * Test suite for GET /api/projects/my-projects
   */
  describe('GET /api/projects/my-projects', () => {
    it('should return 200 and all projects for the authenticated user', async () => {
      // Setup: Create a second project for User One to ensure multiple are returned.
      await Project.create({ name: 'Project Two', owner: userOneId });

      const res = await request(app)
        .get('/api/projects/my-projects')
        .set('Authorization', `Bearer ${tokenOne}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(2);
      // The endpoint should sort by creation date, descending.
      expect(res.body[0].name).toBe('Project Two');
    });

    it('should return 200 and an empty array for a user with no projects', async () => {
      const res = await request(app)
        .get('/api/projects/my-projects')
        .set('Authorization', `Bearer ${tokenTwo}`); // User Two has no projects.

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return 401 if no authorization token is provided', async () => {
      const res = await request(app).get('/api/projects/my-projects');
      expect(res.statusCode).toBe(401);
    });
  });

  /**
   * Test suite for GET /api/projects/:id
   */
  describe('GET /api/projects/:id', () => {
    it('should return 200 and a single project for the owner', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectOneId}`)
        .set('Authorization', `Bearer ${tokenOne}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Project One');
    });

    it('should return 404 if the project ID does not exist', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/projects/${fakeProjectId}`)
        .set('Authorization', `Bearer ${tokenOne}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 if another user tries to fetch the project', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectOneId}`)
        .set('Authorization', `Bearer ${tokenTwo}`); // User Two attempts access.

      expect(res.statusCode).toBe(404);
    });
  });

  /**
   * Test suite for PUT /api/projects/:id
   */
  describe('PUT /api/projects/:id', () => {
    it('should return 200 and the updated project on successful update', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectOneId}`)
        .set('Authorization', `Bearer ${tokenOne}`)
        .send({
          name: 'Updated Project Name',
          data: 'Updated project data',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Updated Project Name');
      expect(res.body.data).toBe('Updated project data');
    });

    it('should return 404 if another user tries to update the project', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectOneId}`)
        .set('Authorization', `Bearer ${tokenTwo}`)
        .send({ name: 'Malicious Update' });

      expect(res.statusCode).toBe(404);
    });
  });

  /**
   * Test suite for DELETE /api/projects/:id
   */
  describe('DELETE /api/projects/:id', () => {
    it('should return 200 on successful deletion by the owner', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectOneId}`)
        .set('Authorization', `Bearer ${tokenOne}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Deleted');

      // For robustness, verify the project is actually gone.
      const getRes = await request(app)
        .get(`/api/projects/${projectOneId}`)
        .set('Authorization', `Bearer ${tokenOne}`);
      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 if another user tries to delete the project', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectOneId}`)
        .set('Authorization', `Bearer ${tokenTwo}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
