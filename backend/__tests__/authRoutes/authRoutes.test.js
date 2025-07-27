/**
 * @file Integration tests for the authentication API endpoints.
 * @description This file contains a suite of tests for user registration, login,
 * password reset functionalities using Jest and Supertest.
 */

// --- CORE DEPENDENCIES ---
import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- JEST MOCKING ---
// Mock the sendEmail utility before any application modules are imported.
// This ensures that the mocked version is used throughout the test suite,
// preventing actual emails from being sent.
jest.unstable_mockModule('../../src/utils/sendEmail.js', () => ({
  default: jest.fn().mockResolvedValue(true),
}));

// --- ENVIRONMENT CONFIGURATION ---
// Load environment variables from a test-specific configuration file.
dotenv.config({ path: '.env.test' });

// --- DYNAMIC MODULE IMPORTS ---
// Dynamically import application modules after mocks have been configured.
// This is crucial to ensure the modules use the mocked dependencies.
const { default: app } = await import('../../src/server.js');
const { default: User } = await import('../../src/models/Users.js');
const { default: sendEmail } = await import('../../src/utils/sendEmail.js');

/**
 * Test suite for Authentication API endpoints.
 */
describe('Auth API', () => {
  // --- TEST LIFECYCLE HOOKS ---

  /**
   * Connect to the test database before any tests in this suite are run.
   */
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
  });

  /**
   * Before each test, clear the User collection and reset mock function states
   * to ensure a clean slate and prevent interference between tests.
   */
  beforeEach(async () => {
    await User.deleteMany({});
    sendEmail.mockClear();
  });

  /**
   * Disconnect from the database after all tests in this suite have completed.
   */
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // --- TEST CASES ---

  /**
   * Tests for the user registration endpoint.
   */
  describe('POST /api/auth/register', () => {
    it('should return 201 and a token on successful registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
    });
  });

  /**
   * Tests for the user login endpoint.
   */
  describe('POST /api/auth/login', () => {
    it('should return 200 and a token on successful login', async () => {
      // Setup: Create a user to log in with.
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
      });

      // Test the login endpoint.
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });
  });

  /**
   * Tests for the forgot password functionality.
   */
  describe('POST /api/auth/forgot-password', () => {
    it('should return 200 and call sendEmail for an existing user', async () => {
      // Setup: Create a user to request a password reset for.
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('If a user with that email exists, a reset link has been sent.');
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    it('should return 200 for a non-existent user but not send an email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nouser@example.com' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('If a user with that email exists, a reset link has been sent.');
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  /**
   * Tests for the password reset functionality using a token.
   */
  describe('POST /api/auth/reset-password/:token', () => {
    it('should return 200 on a successful password reset', async () => {
      // Setup: Create a user and a valid reset token.
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      user.resetToken = resetToken;
      user.resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
      await user.save();

      // Test the password reset endpoint.
      const res = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: 'newpassword123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Password reset successful');
    });

    it('should return 400 for an invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password/invalidtoken')
        .send({ password: 'newpassword123' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Invalid token');
    });
  });
});
