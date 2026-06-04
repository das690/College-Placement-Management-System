const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Connect to your specific Cloudinary account
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure where the files should go and what types are allowed
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'placement_portal_resumes',
    resource_type: 'auto', // <-- This tells Cloudinary to keep it as a standard document!
  },
});

const upload = multer({ storage: storage });

module.exports = upload;