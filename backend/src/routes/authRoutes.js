import express from 'express';
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  protect,
  deleteUser
} from '../controllers/authController.js';

// --- Router Initialization ---
const router = express.Router();

/**
 * Registers a new user and triggers the verification email workflow.
 *
 * @route POST /register
 * @param {Object} req.body - The user registration data (name, email, password).
 * @returns {Object} JSON response indicating success or failure.
 */
router.post('/register', registerUser);

/**
 * Verifies a user's email address using a token.
 *
 * @route GET /verify-email/:token
 * @param {string} req.params.token - The verification token sent via email.
 * @returns {Object} JSON response indicating verification status.
 */
router.get('/verify-email/:token', verifyEmail);

/**
 * Resends the verification email to a user who has not yet verified.
 *
 * @route POST /resend-verification
 * @param {Object} req.body - Contains the user's email address.
 * @returns {Object} JSON response confirming the email was resent.
 */
router.post('/resend-verification', resendVerificationEmail);

/**
 * Authenticates a user and issues a JSON Web Token (JWT).
 *
 * @route POST /login
 * @param {Object} req.body - The user credentials (email, password).
 * @returns {Object} JSON response containing the user profile and token.
 */
router.post('/login', loginUser);

/**
 * Initiates the password reset process by sending a reset link via email.
 *
 * @route POST /forgot-password
 * @param {Object} req.body - The email address associated with the account.
 * @returns {Object} JSON response confirming the reset email was sent.
 */
router.post('/forgot-password', forgotPassword);

/**
 * Resets a user's password using a valid reset token.
 *
 * @route POST /reset-password/:token
 * @param {string} req.params.token - The password reset token.
 * @param {Object} req.body - The new password.
 * @returns {Object} JSON response confirming the password change.
 */
router.post('/reset-password/:token', resetPassword);

/**
 * Permanently deletes the authenticated user's account and associated data.
 * This route is protected and requires valid authentication.
 *
 * @route DELETE /delete-account
 * @param {Object} req.user - The authenticated user object (attached by middleware).
 * @returns {Object} JSON response confirming account deletion.
 */
router.delete('/delete-account', protect, deleteUser);

export default router;