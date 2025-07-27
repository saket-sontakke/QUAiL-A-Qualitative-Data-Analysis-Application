import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/Users.js';
import sendEmail from '../utils/sendEmail.js';

/**
 * @route   POST /api/auth/register
 * @desc    Registers a new user.
 * @access  Public
 * @param   {object} req - The request object.
 * @param   {object} req.body - The request body.
 * @param   {string} req.body.name - The user's name.
 * @param   {string} req.body.email - The user's email address.
 * @param   {string} req.body.password - The user's desired password.
 * @param   {object} res - The response object.
 * @returns {object} 201 - JSON object with a JWT token and a success message.
 * @returns {object} 400 - JSON object with an error message if the user already exists.
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
 * @route   POST /api/auth/login
 * @desc    Authenticates an existing user.
 * @access  Public
 * @param   {object} req - The request object.
 * @param   {object} req.body - The request body.
 * @param   {string} req.body.email - The user's email address.
 * @param   {string} req.body.password - The user's password.
 * @param   {object} res - The response object.
 * @returns {object} 200 - JSON object with a JWT token and user details (name, email).
 * @returns {object} 400 - JSON object with an "Invalid Credentials" error message.
 */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "Invalid Credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: "Invalid Credentials" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({
    token,
    user: { name: user.name, email: user.email }
  });
};

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Initiates the password reset process for a user.
 * @access  Public
 * @param   {object} req - The request object.
 * @param   {object} req.body - The request body.
 * @param   {string} req.body.email - The user's email to send the reset link to.
 * @param   {object} res - The response object.
 * @returns {object} 200 - A generic success message to prevent email enumeration attacks.
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  const responseMessage = "If a user with that email exists, a reset link has been sent.";

  if (user) {
    // Create a short-lived token to be used in the reset link.
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
 * @route   POST /api/auth/reset-password/:token
 * @desc    Resets a user's password using a valid token.
 * @access  Public
 * @param   {object} req - The request object.
 * @param   {string} req.params.token - The password reset token from the URL.
 * @param   {object} req.body - The request body.
 * @param   {string} req.body.password - The user's new password.
 * @param   {object} res - The response object.
 * @returns {object} 200 - A success message.
 * @returns {object} 400 - An error message if the token is invalid, expired, or the password is the same as the old one.
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
  // This block will catch errors from jwt.verify if the token is malformed.
  if (process.env.NODE_ENV !== 'test') {
    console.error("Password reset error: ", err.message);
  }
  res.status(400).json({ error: "Invalid token" });
}
};