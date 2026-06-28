const express = require('express');
const router = express.Router();
const Job = require('../models/Job'); // Adjust this path if your models folder is located elsewhere
const { protect } = require('../middleware/authMiddleware'); // Adjust this path to your auth middleware

// @desc    Get all active jobs
// @route   GET /api/jobs
// @access  Private (Available to all logged-in roles)
router.get('/', protect, async (req, res) => {
  try {
    // We populate the company details so the frontend can display the company name
    const jobs = await Job.find().populate('company', 'name email');
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a new job posting
// @route   POST /api/jobs
// @access  Private (Only Companies and Admins)
router.post('/', protect, async (req, res) => {
  try {
    // Security check: Only companies and admins can post jobs
    if (req.user.role !== 'company' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to post jobs' });
    }

    const { title, description, requirements, location, salary } = req.body;

    const job = await Job.create({
      title,
      description,
      requirements,
      location,
      salary,
      // If an admin posts it, it ties to their ID. If a company posts it, it ties to theirs.
      company: req.user._id 
    });

    // Populate the company field before sending it back so the frontend UI updates smoothly
    const populatedJob = await Job.findById(job._id).populate('company', 'name email');

    res.status(201).json(populatedJob);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a job posting
// @route   DELETE /api/jobs/:id
// @access  Private (Only the owning Company or an Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // SECURITY CHECK: Is the user the company that posted this? OR are they an admin?
    if (job.company.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }
    
    await job.deleteOne();
    res.status(200).json({ message: 'Job successfully removed from the network' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;