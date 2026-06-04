const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary'); // The config file you made earlier
const { protect } = require('../middleware/authMiddleware');

// @desc    Upload a PDF resume to Cloudinary
// @route   POST /api/upload
// @access  Private (Logged in users only)
router.post('/', protect, upload.single('resume'), (req, res) => {
  try {
    // If the file didn't make it through Multer
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file type (must be PDF)' });
    }

    // Cloudinary automatically attaches the live URL to req.file.path
    res.status(200).json({ 
      message: 'Resume uploaded successfully',
      resumeUrl: req.file.path 
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: 'Server error during upload' });
  }
});

module.exports = router;