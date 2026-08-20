const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Drive = require('../models/Drive');
const { protect } = require('../middleware/authMiddleware');

const formatEligibility = (rawEligibility = {}) => {
  let allowedDepts = [];
  if (rawEligibility.allowedDepartments) {
    if (Array.isArray(rawEligibility.allowedDepartments)) {
      allowedDepts = rawEligibility.allowedDepartments.map(d => String(d).trim()).filter(Boolean);
    } else if (typeof rawEligibility.allowedDepartments === 'string') {
      allowedDepts = rawEligibility.allowedDepartments.split(',').map(d => d.trim()).filter(Boolean);
    }
  }

  const minCgpa = (rawEligibility.minCgpa !== undefined && rawEligibility.minCgpa !== '' && !isNaN(rawEligibility.minCgpa)) 
    ? Math.max(0, Math.min(10, Number(rawEligibility.minCgpa))) 
    : 0;

  const maxBacklogs = (rawEligibility.maxBacklogs !== undefined && rawEligibility.maxBacklogs !== '' && !isNaN(rawEligibility.maxBacklogs))
    ? Math.max(0, parseInt(rawEligibility.maxBacklogs, 10))
    : 0;

  const targetGraduationYear = (rawEligibility.targetGraduationYear && !isNaN(rawEligibility.targetGraduationYear))
    ? parseInt(rawEligibility.targetGraduationYear, 10)
    : undefined;

  return {
    minCgpa,
    maxBacklogs,
    allowedDepartments: allowedDepts,
    ...(targetGraduationYear ? { targetGraduationYear } : {})
  };
};

// @desc    Get all active jobs
// @route   GET /api/jobs
// @access  Private (Available to all logged-in roles)
router.get('/', protect, async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('company', 'name email')
      .populate('drive', 'name status academicYear')
      .sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    console.error('GET /api/jobs error:', error.message);
    res.status(500).json({ message: 'Unable to fetch job positions. Please try again later.' });
  }
});

// @desc    Create a new job posting
// @route   POST /api/jobs
// @access  Private (Only Companies and Admins)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'company' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to post jobs. Must be a company or admin.' });
    }

    const { title, description, requirements, location, salary, drive, eligibility } = req.body;

    if (!title || title.trim().length < 2) {
      return res.status(400).json({ message: 'Job Position Title is required.' });
    }
    if (!description || description.trim().length < 10) {
      return res.status(400).json({ message: 'Detailed job description is required (minimum 10 characters).' });
    }
    if (!requirements || requirements.trim().length < 2) {
      return res.status(400).json({ message: 'Job requirements / tech stack are required.' });
    }
    if (!location || location.trim().length < 2) {
      return res.status(400).json({ message: 'Job location is required.' });
    }
    if (!drive) {
      return res.status(400).json({ message: 'A Placement Drive must be selected for every position.' });
    }

    // Verify drive exists
    const driveDoc = await Drive.findById(drive);
    if (!driveDoc) {
      return res.status(404).json({ message: 'Selected Placement Drive was not found.' });
    }

    const formattedEligibility = formatEligibility(eligibility);

    const job = await Job.create({
      title: title.trim(),
      description: description.trim(),
      requirements: requirements.trim(),
      location: location.trim(),
      salary: salary ? salary.trim() : 'Competitive',
      company: req.user._id,
      drive,
      eligibility: formattedEligibility
    });

    const populatedJob = await Job.findById(job._id)
      .populate('company', 'name email')
      .populate('drive', 'name status academicYear');

    res.status(201).json(populatedJob);
  } catch (error) {
    console.error('POST /api/jobs error:', error.message);
    res.status(500).json({ message: 'Failed to post the position. Please try again later.' });
  }
});

// @desc    Update job details and eligibility
// @route   PUT /api/jobs/:id
// @access  Private (Owning Company or Admin)
router.put('/:id', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job position not found.' });

    // Authorization check
    if (job.company.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this job position.' });
    }

    const { title, description, requirements, location, salary, drive, eligibility } = req.body;

    if (title !== undefined) {
      if (title.trim().length < 2) return res.status(400).json({ message: 'Job title must be at least 2 characters.' });
      job.title = title.trim();
    }
    if (description !== undefined) {
      if (description.trim().length < 10) return res.status(400).json({ message: 'Description must be at least 10 characters.' });
      job.description = description.trim();
    }
    if (requirements !== undefined) job.requirements = requirements.trim();
    if (location !== undefined) job.location = location.trim();
    if (salary !== undefined) job.salary = salary.trim();

    if (drive !== undefined) {
      const driveDoc = await Drive.findById(drive);
      if (!driveDoc) return res.status(404).json({ message: 'Selected Placement Drive was not found.' });
      job.drive = drive;
    }

    if (eligibility !== undefined) {
      job.eligibility = formatEligibility(eligibility);
    }

    await job.save();

    const updatedJob = await Job.findById(job._id)
      .populate('company', 'name email')
      .populate('drive', 'name status academicYear');

    res.status(200).json(updatedJob);
  } catch (error) {
    console.error('PUT /api/jobs/:id error:', error.message);
    res.status(500).json({ message: 'Failed to update the position. Please try again later.' });
  }
});

// @desc    Delete a job posting
// @route   DELETE /api/jobs/:id
// @access  Private (Only the owning Company or an Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: 'Job position not found.' });
    }
    
    if (job.company.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this position.' });
    }
    
    await job.deleteOne();
    res.status(200).json({ message: 'Job position successfully removed from the drive.' });
  } catch (error) {
    console.error('DELETE /api/jobs/:id error:', error.message);
    res.status(500).json({ message: 'Failed to delete the position. Please try again later.' });
  }
});

module.exports = router;