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
 * @desc    Handles the registration of a new user.
 * @access  Public
 * @param   {object} req - The Express request object.
 * @param   {object} req.body - The request body, containing name, email, and password.
 * @param   {object} res - The Express response object.
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Handles user authentication and returns a JSON Web Token (JWT) upon success.
 * @access  Public
 * @param   {object} req - The Express request object.
 * @param   {object} req.body - The request body, containing email and password.
 * @param   {object} res - The Express response object.
 */
router.post('/login', loginUser);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Initiates the password reset process. It generates a reset token and sends a password reset email to the user.
 * @access  Public
 * @param   {object} req - The Express request object.
 * @param   {object} req.body - The request body, containing the user's email.
 * @param   {object} res - The Express response object.
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Resets a user's password using a valid token provided in the URL.
 * @access  Public
 * @param   {object} req - The Express request object.
 * @param   {string} req.params.token - The password reset token from the URL.
 * @param   {object} req.body - The request body, containing the new password.
 * @param   {object} res - The Express response object.
 */
router.post('/reset-password/:token', resetPassword);

export default router;
