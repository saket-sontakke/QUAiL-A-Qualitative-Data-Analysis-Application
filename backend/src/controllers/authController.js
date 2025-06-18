import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/Users.js';
import sendEmail from '../utils/sendEmail.js';

export const registerUser = async(req, res) => {
    const {name, email, password} = req.body;
    const hashed = await bcrypt.hash(password, 10);
    try{
        const user = await User.create({name, email, password: hashed});
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET);
        res.status(201).json({token:token, message:"User created successfully"});
    }catch(err){
        res.status(400).json({error: "User already exists"});
    }
};

export const loginUser = async(req, res) => {
    const {email, password} = req.body;
    
    const user = await User.findOne({email});
    if(!user) return res.status(400).json({error: "Invalid Credentials"});
    
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) return res.status(400).json({error: "Invalid Credentials"});

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  user.resetToken = token;
  user.resetTokenExpiry = Date.now() + 3600000;
  await user.save();

  const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;
  await sendEmail(email, "Reset Password", `Click here: ${resetLink}`);
  res.json({ message: "Reset email sent" });
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
  } catch(err) {
    console.error("Password reset error: ", err.message);
    res.status(400).json({ error: "Invalid token" });
  }
};


