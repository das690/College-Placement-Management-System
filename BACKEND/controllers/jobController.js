const Job = require('../models/Job');

// @desc    Create a new job posting
// @route   POST /api/jobs
// @access  Private (Only Companies or Admins)
const createJob = async (req, res) => {
  try {
    // req.user comes from our 'protect' middleware
    const { title, description, requirements, location, salary } = req.body;

    const job = await Job.create({
      company: req.user._id, // Automatically attach the logged-in user's ID
      title,
      description,
      requirements,
      location,
      salary
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all job postings
// @route   GET /api/jobs
// @access  Private (Any logged-in user can view jobs)
const getJobs = async (req, res) => {
  try {
    // Fetch all jobs and also populate the 'company' field with the company's name and email
    const jobs = await Job.find().populate('company', 'name email');
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createJob, getJobs };