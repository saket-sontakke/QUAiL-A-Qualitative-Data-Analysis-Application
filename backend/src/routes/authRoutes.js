import express from 'express';
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail
} from '../controllers/authController.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Handles the registration of a new user and sends verification email.
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Handles user authentication.
 */
router.post('/login', loginUser);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verifies the user's email address.
 * @access  Public
 */
router.get('/verify-email/:token', verifyEmail); // <-- New Route

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Initiates the password reset process.
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Resets a user's password.
 */
router.post('/reset-password/:token', resetPassword);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resends verification email for unverified users.
 */
router.post('/resend-verification', resendVerificationEmail);

export default router;