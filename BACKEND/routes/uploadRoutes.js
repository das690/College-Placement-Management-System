const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;
const { protect } = require('../middleware/authMiddleware');

// Configure Cloudinary from environment variables
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

// Ensure local uploads fallback directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Memory Storage for Cloudinary streaming
const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (
    file.mimetype === 'application/pdf' || 
    file.mimetype === 'application/msword' || 
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
    allowedExts.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF or Word document files (.pdf, .doc, .docx) are allowed.'), false);
  }
};

const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file size
  fileFilter: fileFilter
});

// Helper: Stream buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, originalname) => {
  return new Promise((resolve, reject) => {
    const safeName = path.parse(originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now();
    const publicId = `resume_${safeName}_${uniqueSuffix}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'placement_portal_resumes',
        resource_type: 'auto',
        public_id: publicId,
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    const readable = Readable.from(fileBuffer);
    readable.pipe(uploadStream);
  });
};

// @desc    Upload a PDF or Word Resume file (Cloudinary Cloud Storage with Local Fallback)
// @route   POST /api/upload
// @access  Private (Logged in users only)
router.post('/', protect, (req, res) => {
  upload.single('resume')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'Error processing resume upload: ' + err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No resume document provided. Please choose a valid PDF file.' });
    }

    try {
      const isCloudinaryConfigured = !!(
        process.env.CLOUDINARY_CLOUD_NAME && 
        process.env.CLOUDINARY_API_KEY && 
        process.env.CLOUDINARY_API_SECRET
      );

      if (isCloudinaryConfigured) {
        // Primary: Stream directly to Cloudinary cloud storage
        const cloudResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);
        
        return res.status(200).json({
          message: 'Resume uploaded successfully to Cloudinary cloud storage!',
          resumeUrl: cloudResult.secure_url,
          cloudUrl: cloudResult.secure_url,
          publicId: cloudResult.public_id,
          format: cloudResult.format,
          originalName: req.file.originalname,
          size: req.file.size
        });
      } else {
        // Fallback: Local disk storage if Cloudinary credentials missing
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const safeOriginal = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const ext = path.extname(safeOriginal) || '.pdf';
        const filename = `resume-${uniqueSuffix}${ext}`;
        const filePath = path.join(uploadDir, filename);

        fs.writeFileSync(filePath, req.file.buffer);

        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5000';
        const fullUrl = `${protocol}://${host}/uploads/${filename}`;

        return res.status(200).json({
          message: 'Resume uploaded to server storage.',
          resumeUrl: fullUrl,
          relativeUrl: `/uploads/${filename}`,
          filename,
          originalName: req.file.originalname,
          size: req.file.size
        });
      }
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      
      // Secondary fallback to local disk if Cloudinary network request fails
      try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const safeOriginal = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const ext = path.extname(safeOriginal) || '.pdf';
        const filename = `resume-${uniqueSuffix}${ext}`;
        const filePath = path.join(uploadDir, filename);

        fs.writeFileSync(filePath, req.file.buffer);

        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5000';
        const fullUrl = `${protocol}://${host}/uploads/${filename}`;

        return res.status(200).json({
          message: 'Resume uploaded to local storage backup.',
          resumeUrl: fullUrl,
          relativeUrl: `/uploads/${filename}`,
          filename,
          originalName: req.file.originalname,
          size: req.file.size
        });
      } catch (localError) {
        return res.status(500).json({ message: 'Failed to store resume: ' + localError.message });
      }
    }
  });
});

// @desc    Stream / View Local Resume Inline (for fallback files)
// @route   GET /api/upload/view/:filename
// @access  Public
router.get('/view/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(uploadDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Resume document not found on server.' });
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

module.exports = router;