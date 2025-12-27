import express from 'express';
import { runTest } from '../controllers/statsController.js';
import { protect } from '../controllers/authController.js';

// --- Router Initialization ---
const router = express.Router();

/**
 * Configures the POST route for triggering test executions.
 *
 * @path {POST} /run
 * @middleware {Function} protect - Middleware to authenticate the user.
 * @handler {Function} runTest - Controller function that executes the test logic.
 */
router.post('/run', protect, runTest);

// --- Module Export ---
export default router;