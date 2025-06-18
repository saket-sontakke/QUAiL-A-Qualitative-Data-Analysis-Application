import express from 'express';
import { registerUser } from '../controllers/authController.js';
import { loginUser } from '../controllers/authController.js';
import { forgotPassword } from '../controllers/authController.js';
import { resetPassword } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;