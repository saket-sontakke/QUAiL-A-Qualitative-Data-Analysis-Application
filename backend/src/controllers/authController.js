import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/Users.js';
import sendEmail from '../utils/sendEmail.js';

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
 * Registers a new user and sends verification email.
 * @route POST /api/auth/register
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

    const verifyUrl = `${process.env.VITE_FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verifyToken}`;

    const message = `
      <h1>Email Verification</h1>
      <p>Please verify your QUAiL account by clicking the link below:</p>
      <a href="${verifyUrl}" clicktracking=off>${verifyUrl}</a>
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
 * Authenticates user, checks verification status, returns JWT.
 * @route POST /api/auth/login
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
 * Verifies email based on token.
 * @route GET /api/auth/verify-email/:token
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

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  const responseMessage = "If a user with that email exists, a reset link has been sent.";

  if (user) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;
    await sendEmail(email, "Reset Password", `Click here to reset your password: ${resetLink}`);
  }

  res.status(200).json({ message: responseMessage });
};

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

    res.json({ message: "Password reset successful" });
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error("Password reset error: ", err.message);
    }
    res.status(400).json({ error: "Invalid token" });
  }
};
