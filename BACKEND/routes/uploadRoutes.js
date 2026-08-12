const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');

// Ensure local uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Local disk storage
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `resume-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype === 'application/pdf' || 
      file.mimetype === 'application/msword' || 
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF or Word document files (.pdf, .doc, .docx) are allowed'), false);
  }
};

const localUpload = multer({
  storage: localStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file size
  fileFilter: fileFilter
});

// @desc    Upload a PDF or Word Resume file
// @route   POST /api/upload
// @access  Private (Logged in users only)
router.post('/', protect, (req, res) => {
  localUpload.single('resume')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: 'Error uploading file: ' + err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No resume file uploaded or invalid file format. Please select a valid PDF or Word document.' });
    }
    
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:5000';
    const resumeUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    
    return res.status(200).json({
      message: 'Resume uploaded successfully!',
      resumeUrl,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  });
});

module.exports = router;