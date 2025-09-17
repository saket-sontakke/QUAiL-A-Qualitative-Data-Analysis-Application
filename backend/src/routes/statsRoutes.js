import express from 'express';
import { runTest } from '../controllers/statsController.js';
import { protect } from '../controllers/authController.js';

/**
 * Express router for handling statistics and performance test related endpoints.
 * All routes defined here are prefixed with '/api/stats'.
 * @module routes/statsRouter
 */
const router = express.Router();

/**
 * Route to execute a performance or diagnostic test.
 * This is a protected endpoint that requires user authentication. The specific
 * test to be executed is determined by the contents of the request body.
 *
 * @name POST /api/stats/run
 * @function
 * @memberof module:routes/statsRouter
 * @inner
 * @param {string} path - Express path
 * @param {function} middleware - Authentication middleware to protect the route.
 * @param {function} controller - Controller function to handle the test execution.
 */
router.post('/run', protect, runTest);

export default router;