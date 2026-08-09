const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// Utility function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please add all required fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'student', // Default to student if not provided
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        academicDetails: user.academicDetails,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        academicDetails: user.academicDetails,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update student academic profile
// @route   PUT /api/users/profile
// @access  Private (Students)
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Process skills and certifications arrays if passed as string or array
    let skillsArray = user.academicDetails?.skills || [];
    if (req.body.skills !== undefined) {
      skillsArray = Array.isArray(req.body.skills) 
        ? req.body.skills 
        : String(req.body.skills).split(',').map(s => s.trim()).filter(Boolean);
    }

    let certsArray = user.academicDetails?.certifications || [];
    if (req.body.certifications !== undefined) {
      certsArray = Array.isArray(req.body.certifications) 
        ? req.body.certifications 
        : String(req.body.certifications).split(',').map(c => c.trim()).filter(Boolean);
    }

    // Update the academic details object
    user.academicDetails = {
      department: req.body.department || user.academicDetails?.department,
      graduationYear: req.body.graduationYear ? Number(req.body.graduationYear) : user.academicDetails?.graduationYear,
      cgpa: req.body.cgpa ? Number(req.body.cgpa) : user.academicDetails?.cgpa,
      activeBacklogs: req.body.activeBacklogs !== undefined ? Number(req.body.activeBacklogs) : (user.academicDetails?.activeBacklogs || 0),
      skills: skillsArray,
      certifications: certsArray,
      resumeUrl: req.body.resumeUrl || user.academicDetails?.resumeUrl || ''
    };
    
    const updatedUser = await user.save();
    
    res.status(200).json({
      _id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      academicDetails: updatedUser.academicDetails,
      token: generateToken(updatedUser._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;