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
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const ext = path.extname(safeOriginal) || '.pdf';
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
    cb(new Error('Only PDF or Word document files (.pdf, .doc, .docx) are allowed.'), false);
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
      return res.status(400).json({ message: 'Error uploading resume file: ' + err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No resume file provided. Please choose a valid PDF document.' });
    }
    
    // Build canonical public URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5000';
    const resumeUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    const viewUrl = `${protocol}://${host}/api/upload/view/${req.file.filename}`;
    
    return res.status(200).json({
      message: 'Resume uploaded successfully!',
      resumeUrl,
      relativeUrl: `/uploads/${req.file.filename}`,
      viewUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  });
});

// @desc    Stream / View Resume Inline in browser
// @route   GET /api/upload/view/:filename
// @access  Public
router.get('/view/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(uploadDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Resume document not found on server or expired.' });
  }

  const ext = path.extname(safeFilename).toLowerCase();
  if (ext === '.pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
  } else if (ext === '.docx') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  } else if (ext === '.doc') {
    res.setHeader('Content-Type', 'application/msword');
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(filePath);
});

// @desc    Download Resume Attachment
// @route   GET /api/upload/download/:filename
// @access  Public
router.get('/download/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(uploadDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Resume document not found on server.' });
  }

  res.download(filePath, safeFilename);
});

module.exports = router;