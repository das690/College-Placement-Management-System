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

// Local disk storage fallback
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
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF resume files (.pdf) are allowed'), false);
  }
};

const localUpload = multer({
  storage: localStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Try loading Cloudinary config
let cloudinaryUpload;
try {
  cloudinaryUpload = require('../config/cloudinary');
} catch (e) {
  cloudinaryUpload = null;
}

// @desc    Upload a PDF resume (Cloudinary with Local Fallback)
// @route   POST /api/upload
// @access  Private (Logged in users only)
router.post('/', protect, (req, res) => {
  const hasCloudinaryEnv = process.env.CLOUDINARY_CLOUD_NAME && 
                           process.env.CLOUDINARY_API_KEY && 
                           process.env.CLOUDINARY_API_SECRET;

  if (cloudinaryUpload && hasCloudinaryEnv) {
    const singleCloudinary = cloudinaryUpload.single('resume');
    singleCloudinary(req, res, (err) => {
      if (!err && req.file && req.file.path) {
        return res.status(200).json({ 
          message: 'Resume uploaded successfully to Cloudinary',
          resumeUrl: req.file.path 
        });
      }
      console.warn("Cloudinary upload failed, falling back to local storage:", err?.message || 'Unknown error');
      fallbackToLocal(req, res);
    });
  } else {
    fallbackToLocal(req, res);
  }
});

function fallbackToLocal(req, res) {
  localUpload.single('resume')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: 'Error uploading file: ' + err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file format' });
    }
    
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:5000';
    const resumeUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    
    return res.status(200).json({
      message: 'Resume uploaded successfully',
      resumeUrl,
      filename: req.file.filename
    });
  });
}

module.exports = router;