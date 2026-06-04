const express = require('express');
const router = express.Router();
const { applyForJob, getApplications, updateApplicationStatus } = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getApplications);
router.post('/', protect, authorize('student'), applyForJob);

// NEW ROUTE: Allow companies to update the status of a specific application
router.put('/:id/status', protect, authorize('company', 'admin'), updateApplicationStatus);

module.exports = router;