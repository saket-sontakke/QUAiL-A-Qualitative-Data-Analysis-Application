import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/Users.js';
import sendEmail from '../utils/sendEmail.js';

/**
 * Express middleware to protect routes by verifying a JWT token.
 * It expects a 'Bearer <token>' in the Authorization header. If the token is
 * valid, it fetches the corresponding user from the database (excluding the
 * password) and attaches it to the request object as `req.user`.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The next middleware function.
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
 * Registers a new user.
 * @route POST /api/auth/register
 * @access Public
 * @param {import('express').Request} req - The Express request object, containing `name`, `email`, and `password` in the body.
 * @param {import('express').Response} res - The Express response object.
 */
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.status(201).json({ token: token, message: "User created successfully" });
  } catch (err) {
    res.status(400).json({ error: "User already exists" });
  }
};

/**
 * Authenticates an existing user and returns a JWT token.
 * @route POST /api/auth/login
 * @access Public
 * @param {import('express').Request} req - The Express request object, containing `email` and `password` in the body.
 * @param {import('express').Response} res - The Express response object.
 */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ error: "Invalid Credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: "Invalid Credentials" });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({
    token,
    user: { name: user.name, email: user.email }
  });
};

/**
 * Initiates the password reset process by generating a reset token and sending
 * a password reset link to the user's email.
 * @route POST /api/auth/forgot-password
 * @access Public
 * @param {import('express').Request} req - The Express request object, containing `email` in the body.
 * @param {import('express').Response} res - The Express response object.
 */
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

/**
 * Resets a user's password using a valid token from a password reset link.
 * @route POST /api/auth/reset-password/:token
 * @access Public
 * @param {import('express').Request} req - The Express request object, containing the `token` in params and `password` in the body.
 * @param {import('express').Response} res - The Express response object.
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

    res.json({ message: "Password reset successful" });
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error("Password reset error: ", err.message);
    }
    res.status(400).json({ error: "Invalid token" });
  }
};