import express from 'express';
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Handles new user registration.
 * @access  Public
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Handles user authentication and provides a JWT.
 * @access  Public
 */
router.post('/login', loginUser);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Initiates the password reset process by sending an email.
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Resets the user's password using a valid token.
 * @access  Public
 */
router.post('/reset-password/:token', resetPassword);

export default router;