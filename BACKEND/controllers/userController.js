const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // or 'bcrypt' depending on what you installed
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Helper function to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    // NEW: We are now accepting an adminCode from the frontend
    const { name, email, password, role, adminCode } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // NEW SECURITY CHECK: If they want to be an admin, verify the code
    if (role === 'admin') {
      if (adminCode !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ message: 'Invalid Admin Passcode' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'student',
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// NEW: PASSWORD RESET PIPELINE
// ==========================================

// @desc    Forgot Password - Generates token and sends email
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'There is no user with that email' });

    // 1. Generate a random reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // 2. Hash the token and save it to the database (expires in 10 minutes)
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    // 3. Create the reset URL dynamically using the environment variable
    // This allows it to work on both local testing and production deployment!
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendURL}/reset-password/${resetToken}`;
    
    // 4. Send the Email
    const message = `You are receiving this email because you (or someone else) requested a password reset. \n\nPlease click on the following link, or paste it into your browser to complete the process: \n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`;

    await sendEmail({
      email: user.email,
      subject: 'Placement Portal - Password Reset Token',
      message: message,
    });

    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    // If anything fails, clear the token from the database
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
    }
    res.status(500).json({ message: 'Email could not be sent' });
  }
};

// @desc    Reset Password - Takes the token and saves the new password
// @route   PUT /api/users/reset-password/:resetToken
// @access  Public
const resetPassword = async (req, res) => {
  try {
    // 1. Hash the token from the URL to match it against the database
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    // 2. Find the user with that token AND check if it hasn't expired yet
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    // 3. Hash the new password from the request body
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);

    // 4. Clear the temporary token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword
};