const express = require('express');
const router = express.Router();
const Job = require('../models/Job'); // Adjust this path if your models folder is located elsewhere
const { protect } = require('../middleware/authMiddleware'); // Adjust this path to your auth middleware

// @desc    Get all active jobs
// @route   GET /api/jobs
// @access  Private (Available to all logged-in roles)
router.get('/', protect, async (req, res) => {
  try {
    // Populate company and drive details
    const jobs = await Job.find()
      .populate('company', 'name email')
      .populate('drive', 'name status academicYear');
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

    const { title, description, requirements, location, salary, drive, eligibility } = req.body;

    if (!drive) {
      return res.status(400).json({ message: 'A Placement Drive must be selected for every job position.' });
    }

    const job = await Job.create({
      title,
      description,
      requirements,
      location,
      salary,
      company: req.user._id,
      drive,
      eligibility: eligibility || {}
    });

    const populatedJob = await Job.findById(job._id)
      .populate('company', 'name email')
      .populate('drive', 'name status academicYear');

    res.status(201).json(populatedJob);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update job details and eligibility
// @route   PUT /api/jobs/:id
// @access  Private (Owning Company or Admin)
router.put('/:id', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job position not found' });

    if (job.company.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    const { title, description, requirements, location, salary, drive, eligibility } = req.body;
    if (title) job.title = title;
    if (description) job.description = description;
    if (requirements) job.requirements = requirements;
    if (location) job.location = location;
    if (salary) job.salary = salary;
    if (drive) job.drive = drive;
    if (eligibility) job.eligibility = eligibility;

    await job.save();
    const updatedJob = await Job.findById(job._id)
      .populate('company', 'name email')
      .populate('drive', 'name status academicYear');

    res.status(200).json(updatedJob);
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