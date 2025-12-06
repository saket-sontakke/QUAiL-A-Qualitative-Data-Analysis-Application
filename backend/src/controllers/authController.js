import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/Users.js';
import sendEmail from '../utils/sendEmail.js';

// Helper to define the frontend URL consistently
const getClientUrl = () => process.env.CLIENT_URL || process.env.VITE_FRONTEND_URL || 'http://localhost:5173';

/**
 * Middleware to protect routes.
 * Verifies the JWT token from the Authorization header.
 * * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ error: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Not authorized, no token' });
  }
};

/**
 * Registers a new user and sends a verification email.
 * * @route POST /api/auth/register
 * @access Public
 */
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const verifyToken = crypto.randomBytes(20).toString('hex');

    const user = await User.create({ 
        name, 
        email, 
        password: hashedPassword,
        verificationToken: verifyToken,
        verificationTokenExpire: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    const verifyUrl = `${getClientUrl()}/verify-email/${verifyToken}`;

    // Professional HTML Template
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #333;">Welcome to QUAiL!</h2>
        <p style="color: #555; font-size: 16px;">Hi ${name},</p>
        <p style="color: #555; font-size: 16px;">Please verify your account by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" clicktracking=off style="background-color: #4CAF50; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px; font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 20px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verifyUrl}" style="color: #4CAF50;">${verifyUrl}</a>
        </p>
      </div>
    `;

    try {
        await sendEmail(email, "Verify your email", message);
        
        res.status(201).json({ 
            message: "Registration successful! Please check your email to verify your account." 
        });
    } catch (error) {
        await User.findByIdAndDelete(user._id);
        return res.status(500).json({ error: "Email could not be sent. Please try again." });
    }

  } catch (err) {
    if (err.code === 11000) {
        return res.status(400).json({ error: "User already exists" });
    }
    if (err.name === 'ValidationError') {
         const messages = Object.values(err.errors).map(val => val.message);
         return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Authenticates user, checks verification status, and returns JWT.
 * * @route POST /api/auth/login
 * @access Public
 */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: "Invalid Credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid Credentials" });
      }

      if (!user.isVerified) {
          return res.status(401).json({ error: "Please verify your email to log in." });
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.json({
        token,
        user: { name: user.name, email: user.email }
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server Error" });
  }
};

/**
 * Verifies email based on token passed in URL.
 * * @route GET /api/auth/verify-email/:token
 * @access Public
 */
export const verifyEmail = async (req, res) => {
    const { token } = req.params;
    
    try {
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired token" });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpire = undefined;
        await user.save();

        res.status(200).json({ message: "Email verified successfully. You can now login." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server Error" });
    }
};

/**
 * Initiates the forgot password process.
 * Sends a reset link to the user's email if it exists.
 * * @route POST /api/auth/forgot-password
 * @access Public
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  const responseMessage = "If a user with that email exists, a reset link has been sent.";

  if (user) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 Hour
    await user.save();

    const resetLink = `${getClientUrl()}/reset-password/${token}`;

    // Professional HTML Template
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p style="color: #555; font-size: 16px;">Hello,</p>
        <p style="color: #555; font-size: 16px;">We received a request to reset the password for your QUAiL account. If you didn't make this request, you can safely ignore this email.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" clicktracking=off style="background-color: #4CAF50; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 20px;">
          Or copy and paste this link into your browser:<br>
          <a href="${resetLink}" style="color: #4CAF50;">${resetLink}</a>
        </p>
      </div>
    `;

    await sendEmail(email, "Reset Password", message);
  }

  res.status(200).json({ message: responseMessage });
};

/**
 * Resets the user's password using a valid token.
 * Sends a confirmation email upon success.
 * * @route POST /api/auth/reset-password/:token
 * @access Public
 */
export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id, resetToken: token });

    if (!user || user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return res.status(400).json({ error: 'New password must be different from the old password' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    // Confirmation Email HTML Template
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #333;">Password Changed</h2>
        <p style="color: #555; font-size: 16px;">Hi ${user.name},</p>
        <p style="color: #555; font-size: 16px;">This is a confirmation that the password for your QUAiL account was just changed.</p>
        <p style="color: #555; font-size: 16px;">If you did not perform this action, please contact support immediately.</p>
      </div>
    `;

    // Send confirmation (non-blocking)
    sendEmail(user.email, "Password Changed Successfully", message)
      .catch(err => console.error("Failed to send password reset confirmation", err));

    res.json({ message: "Password reset successful" });
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error("Password reset error: ", err.message);
    }
    res.status(400).json({ error: "Invalid token" });
  }
};