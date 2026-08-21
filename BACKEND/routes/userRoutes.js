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
    const { name, email, password, role, adminCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide your full name, email address, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    if (role === 'admin') {
      const validAdminCode = process.env.ADMIN_SECRET || 'GUVI-ADMIN';
      if (adminCode !== validAdminCode) {
        return res.status(403).json({ message: 'Invalid Admin Passcode. Please enter the correct secret key.' });
      }
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email address already exists. Please login instead.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'student',
      academicDetails: (role === 'student' || !role) ? {
        department: '',
        graduationYear: 2026,
        cgpa: null,
        activeBacklogs: 0,
        skills: [],
        certifications: [],
        resumeUrl: ''
      } : undefined
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
    console.error('POST /api/users/register error:', error.message);
    res.status(500).json({ message: 'Registration failed due to a server error. Please try again later.' });
  }
});

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email address and password are required.' });
    }

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
      res.status(401).json({ message: 'Invalid email or password. Please check your credentials and try again.' });
    }
  } catch (error) {
    console.error('POST /api/users/login error:', error.message);
    res.status(500).json({ message: 'Login failed due to a server error. Please try again later.' });
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
    console.error('GET /api/users/me error:', error.message);
    res.status(500).json({ message: 'Failed to fetch your profile. Please try again.' });
  }
});

// @desc    Get all students (for Admin / Department reports)
// @route   GET /api/users/students
// @access  Private (Admins & Companies)
router.get('/students', protect, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 });
    res.status(200).json(students);
  } catch (error) {
    console.error('GET /api/users/students error:', error.message);
    res.status(500).json({ message: 'Failed to fetch students list.' });
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
    const existingDetails = user.academicDetails || {};
    user.academicDetails = {
      department: req.body.department !== undefined ? req.body.department : existingDetails.department,
      graduationYear: (req.body.graduationYear !== undefined && req.body.graduationYear !== '') 
        ? Number(req.body.graduationYear) 
        : existingDetails.graduationYear,
      cgpa: (req.body.cgpa !== undefined && req.body.cgpa !== null && req.body.cgpa !== '') 
        ? Number(req.body.cgpa) 
        : existingDetails.cgpa,
      activeBacklogs: req.body.activeBacklogs !== undefined 
        ? Number(req.body.activeBacklogs) 
        : (existingDetails.activeBacklogs || 0),
      skills: skillsArray,
      certifications: certsArray,
      resumeUrl: req.body.resumeUrl !== undefined ? req.body.resumeUrl : (existingDetails.resumeUrl || '')
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
    console.error('PUT /api/users/profile error:', error.message);
    res.status(500).json({ message: 'Failed to update your academic profile. Please try again.' });
  }
});

// @desc    Bulk Import Students from CSV data
// @route   POST /api/users/import-students
// @access  Private (Admin only)
router.post('/import-students', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators are authorized to perform bulk student imports.' });
    }

    const { students } = req.body;
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'No student records provided in import payload.' });
    }

    const salt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash('Student@2026', salt);

    let importedCount = 0;
    let duplicateCount = 0;
    const skippedRecords = [];
    const importedRecords = [];

    for (const record of students) {
      const email = record.email ? String(record.email).trim().toLowerCase() : '';
      const name = record.name ? String(record.name).trim() : '';

      if (!email || !name) {
        skippedRecords.push({ email, name, reason: 'Missing name or email' });
        continue;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        duplicateCount++;
        skippedRecords.push({ email, name, reason: 'Email already exists in system' });
        continue;
      }

      // Format skills
      let skillsArray = [];
      if (record.skills) {
        skillsArray = Array.isArray(record.skills)
          ? record.skills
          : String(record.skills).split(',').map(s => s.trim()).filter(Boolean);
      }

      const cgpa = (record.cgpa !== undefined && record.cgpa !== '' && !isNaN(record.cgpa)) 
        ? Math.max(0, Math.min(10, Number(record.cgpa))) 
        : null;

      const graduationYear = (record.graduationYear && !isNaN(record.graduationYear))
        ? Number(record.graduationYear)
        : 2026;

      const activeBacklogs = (record.activeBacklogs !== undefined && record.activeBacklogs !== '' && !isNaN(record.activeBacklogs))
        ? Math.max(0, parseInt(record.activeBacklogs, 10))
        : 0;

      const customPassword = record.password ? await bcrypt.hash(String(record.password), salt) : defaultHashedPassword;

      const newUser = await User.create({
        name,
        email,
        password: customPassword,
        role: 'student',
        academicDetails: {
          department: record.department ? String(record.department).trim() : '',
          graduationYear,
          cgpa,
          activeBacklogs,
          skills: skillsArray,
          certifications: [],
          resumeUrl: record.resumeUrl ? String(record.resumeUrl).trim() : ''
        }
      });

      importedCount++;
      importedRecords.push({
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        department: newUser.academicDetails.department,
        cgpa: newUser.academicDetails.cgpa
      });
    }

    res.status(200).json({
      message: `Bulk import completed! ${importedCount} student(s) imported successfully, ${duplicateCount} skipped.`,
      importedCount,
      duplicateCount,
      totalProcessed: students.length,
      skippedRecords,
      importedRecords
    });
  } catch (error) {
    console.error('POST /api/users/import-students error:', error);
    res.status(500).json({ message: 'Failed to complete student import: ' + error.message });
  }
});

module.exports = router;