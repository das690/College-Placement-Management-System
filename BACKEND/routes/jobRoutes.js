const express = require('express');
const router = express.Router();
const { createJob, getJobs } = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/jobs -> Anyone logged in can view jobs
router.get('/', protect, getJobs);

// POST /api/jobs -> ONLY users with 'company' or 'admin' role can post a job
router.post('/', protect, authorize('company', 'admin'), createJob);

module.exports = router;