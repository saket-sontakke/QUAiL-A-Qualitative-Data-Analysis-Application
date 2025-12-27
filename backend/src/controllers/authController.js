import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import User from '../models/Users.js';
import Project from '../models/Project.js';
import sendEmail from '../utils/sendEmail.js';

/**
 * Retrieves the base URL for the frontend client application from the environment configuration.
 *
 * @returns {string} The configured client URL.
 */
const getClientUrl = () => process.env.CLIENT_URL;

/**
 * Express middleware to protect routes by verifying the JSON Web Token (JWT) from the request headers.
 * It decodes the token to identify the user and attaches the user profile (excluding the password) to the request object.
 *
 * @param {Object} req - The Express request object containing headers.
 * @param {Object} res - The Express response object used to send error responses.
 * @param {Function} next - The callback function to pass control to the next middleware.
 * @returns {Promise<void>} Resolves when the next middleware is called or a response is sent.
 */
export const protect = async (req, res, next) => {
  let token;

  // --- Token Extraction & Verification ---
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      // --- User Validation ---
      if (!req.user) {
        return res.status(401).json({ error: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  // --- Missing Token Check ---
  if (!token) {
    res.status(401).json({ error: 'Not authorized, no token' });
  }
};

/**
 * Resends the account verification email to a registered user.
 * * Validates the user's existence and verification status before generating
 * a new verification token, updating the database, and dispatching the email.
 *
 * @param {Object} req - The Express request object, containing the email in `req.body`.
 * @param {Object} res - The Express response object used to return status codes and JSON messages.
 * @returns {Promise<void>} Resolves when the response is sent to the client.
 */
export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  try {
    // --- User Lookup & Validation ---
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "This account is already verified. Please login." });
    }

    // --- Token Generation & Persistence ---
    const verifyToken = crypto.randomBytes(20).toString('hex');
    user.verificationToken = verifyToken;
    user.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    // --- Email Construction & Delivery ---
    const verifyUrl = `${getClientUrl()}/verify-email/${verifyToken}`;

    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #333;">Verify your Email</h2>
        <p style="color: #555; font-size: 16px;">Hi ${user.name},</p>
        <p style="color: #555; font-size: 16px;">We received a request to resend your verification link. Please click the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" clicktracking=off style="background-color: #F05623; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px; font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 20px;">
          Link valid for 24 hours. If the button doesn't work, use this link:<br>
          <a href="${verifyUrl}" style="color: #F05623;">${verifyUrl}</a>
        </p>
      </div>
    `;

    await sendEmail(email, "Verify your email (Resent)", message);

    res.status(200).json({ message: "Verification email resent. Please check your inbox." });

  } catch (error) {
    // --- Error Handling ---
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
};

/**
 * Registers a new user, hashes the password, creates a database record, and sends a verification email.
 * Handles transaction rollback by deleting the user if the verification email fails to send.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The payload containing user registration details.
 * @param {string} req.body.name - The user's full name.
 * @param {string} req.body.email - The user's email address.
 * @param {string} req.body.password - The user's raw password.
 * @param {Object} res - The Express response object.
 * @returns {Promise<Object>} A JSON response indicating success or failure.
 */
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // --- Security & Token Generation ---
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const verifyToken = crypto.randomBytes(20).toString('hex');

    // --- User Record Creation ---
    const user = await User.create({ 
        name, 
        email, 
        password: hashedPassword,
        verificationToken: verifyToken,
        verificationTokenExpire: Date.now() + 24 * 60 * 60 * 1000 
    });

    // --- Email Template Construction ---
    const verifyUrl = `${getClientUrl()}/verify-email/${verifyToken}`;

    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #333;">Welcome to QUAiL!</h2>
        <p style="color: #555; font-size: 16px;">Hi ${name},</p>
        <p style="color: #555; font-size: 16px;">Please verify your account by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" clicktracking=off style="background-color: #F05623; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px; font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 20px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verifyUrl}" style="color: #F05623;">${verifyUrl}</a>
        </p>
      </div>
    `;

    // --- Verification Email Transmission ---
    try {
        await sendEmail(email, "Verify your email", message);
        
        res.status(201).json({ 
            message: "Registration successful! Please check your email to verify your account." 
        });
    } catch (error) {
        // --- Rollback: Delete User on Email Failure ---
        await User.findByIdAndDelete(user._id);
        return res.status(500).json({ error: "Email could not be sent. Please try again." });
    }

  } catch (err) {
    // --- Error Handling ---
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
 * Authenticates a user by verifying credentials and returning a JWT.
 *
 * @param {Object} req - The Express request object, containing the user's email and password in the body.
 * @param {Object} res - The Express response object used to send back the authentication status and token.
 * @returns {Promise<void>} Sends a JSON response with the auth token and user details upon success, or an error message upon failure.
 */
export const loginUser = async (req, res) => {
  // --- Input Extraction ---
  const { email, password } = req.body;
  try {
      // --- User Lookup ---
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: "Invalid Credentials" });
      }

      // --- Password Validation ---
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid Credentials" });
      }

      // --- Verification Check ---
      if (!user.isVerified) {
          return res.status(401).json({ error: "Please verify your email to log in." });
      }

      // --- Token Generation & Response ---
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.json({
        token,
        user: { name: user.name, email: user.email }
      });
  } catch (err) {
      // --- Error Handling ---
      console.error(err);
      res.status(500).json({ error: "Server Error" });
  }
};

/**
 * Verifies a user's email address using a verification token.
 * * Checks for a valid, non-expired token in the database. If found,
 * marks the user as verified and clears the token fields.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.params - The request parameters.
 * @param {string} req.params.token - The verification token extracted from the URL.
 * @param {Object} res - The Express response object used to send back the status and JSON data.
 * @returns {Promise<void>} A promise that resolves when the response is sent.
 */
export const verifyEmail = async (req, res) => {
    // --- Input Extraction ---
    const { token } = req.params;
    
    try {
        // --- Database Lookup ---
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpire: { $gt: Date.now() }
        });

        // --- Validation ---
        if (!user) {
            return res.status(400).json({ error: "Invalid or expired token" });
        }

        // --- User Update ---
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpire = undefined;
        await user.save();

        // --- Success Response ---
        res.status(200).json({ message: "Email verified successfully. You can now login." });
    } catch (error) {
        // --- Error Handling ---
        console.error(error);
        res.status(500).json({ error: "Server Error" });
    }
};

/**
 * Initiates the password recovery workflow.
 * Generates a password reset token and sends an email to the user if the account exists.
 * Uses a generic response message to prevent email enumeration attacks.
 *
 * @param {Object} req - The Express request object containing the user's email in the body.
 * @param {Object} res - The Express response object used to send the status back to the client.
 * @returns {Promise<void>} Sends a JSON response indicating the process has completed.
 */
export const forgotPassword = async (req, res) => {
  // --- Input Extraction ---
  const { email } = req.body;

  // --- User Verification ---
  const user = await User.findOne({ email });
  const responseMessage = "If a user with that email exists, a reset link has been sent.";

  if (user) {
    // --- Token Generation & Persistence ---
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();

    // --- Email Notification ---
    const resetLink = `${getClientUrl()}/reset-password/${token}`;

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

  // --- Response ---
  res.status(200).json({ message: responseMessage });
};

/**
 * Resets a user's password using a valid JWT reset token.
 * This function verifies the token, checks for expiration, ensures the new password
 * differs from the current one, updates the database, and triggers a confirmation email.
 *
 * @param {Object} req - The Express request object, containing the reset token in `req.params` and new password in `req.body`.
 * @param {Object} res - The Express response object used to return status codes and JSON messages.
 * @returns {Promise<void>} Resolves when the response is sent to the client.
 */
export const resetPassword = async (req, res) => {
  // --- Input Extraction ---
  const { token } = req.params;
  const { password } = req.body;

  try {
    // --- Token Verification and User Lookup ---
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id, resetToken: token });

    // --- Validation: Existence and Expiry ---
    if (!user || user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // --- Validation: Password Reuse Check ---
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return res.status(400).json({ error: 'New password must be different from the old password' });
    }

    // --- Data Persistence: Update Password and Clear Token ---
    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    // --- Email Notification Construction ---
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #333;">Password Changed</h2>
        <p style="color: #555; font-size: 16px;">Hi ${user.name},</p>
        <p style="color: #555; font-size: 16px;">This is a confirmation that the password for your QUAiL account was just changed.</p>
        <p style="color: #555; font-size: 16px;">If you did not perform this action, please contact support immediately.</p>
      </div>
    `;

    // --- Send Confirmation Email ---
    sendEmail(user.email, "Password Changed Successfully", message)
      .catch(err => console.error("Failed to send password reset confirmation", err));

    res.json({ message: "Password reset successful" });
  } catch (err) {
    // --- Error Handling ---
    if (process.env.NODE_ENV !== 'test') {
      console.error("Password reset error: ", err.message);
    }
    res.status(400).json({ error: "Invalid token" });
  }
};

/**
 * Handles the complete deletion of a user account, including all associated database records
 * and physical files stored on the server.
 *
 * @param {Object} req - The Express request object, containing the authenticated user details.
 * @param {Object} res - The Express response object used to send the status and message.
 * @returns {Promise<void>} A promise that resolves when the response is sent.
 */
export const deleteUser = async (req, res) => {
  try {
    // --- User Identification ---
    const userId = req.user._id; 
    
    // --- Project Retrieval ---
    const projects = await Project.find({ owner: userId });

    // --- Physical File Cleanup ---
    projects.forEach(project => {
      if (project.importedFiles && project.importedFiles.length > 0) {
        project.importedFiles.forEach(file => {
          if (file.sourceType === 'audio' && file.audioUrl && !file.audioUrl.startsWith('http')) {
            try {
              const relativePath = file.audioUrl.startsWith('/') ? file.audioUrl.slice(1) : file.audioUrl;
              const filePath = path.resolve(relativePath);
              
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[Cleanup] Deleted physical file: ${filePath}`);
              }
            } catch (err) {
              console.error(`[Cleanup] Failed to delete file for project ${project.name}:`, err);
            }
          }
        });
      }
    });

    // --- Database Cleanup ---
    await Project.deleteMany({ owner: userId });

    await User.findByIdAndDelete(userId);

    // --- Success Response ---
    res.status(200).json({ message: "User account and all associated data deleted successfully." });
  } catch (error) {
    // --- Error Handling ---
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Server error while deleting account" });
  }
};