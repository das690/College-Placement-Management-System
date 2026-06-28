const express = require('express');
const router = express.Router();
const Application = require('../models/Application'); // Adjust path if your models folder is named differently
const { protect } = require('../middleware/authMiddleware'); // Adjust path to your auth middleware

// @desc    Get all applications
// @route   GET /api/applications
// @access  Private (All roles can fetch, frontend handles filtering based on role)
router.get('/', protect, async (req, res) => {
  try {
    // Populate the student and job details (including nested company details) 
    // so the frontend tables can display names instead of raw IDs
    const applications = await Application.find()
      .populate('student', 'name email')
      .populate({
        path: 'job',
        populate: {
          path: 'company',
          select: 'name email'
        }
      });
      
    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Submit a new application
// @route   POST /api/applications
// @access  Private (Only Students)
router.post('/', protect, async (req, res) => {
  try {
    // Security check: Only students can apply for jobs
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can apply for jobs' });
    }

    const { jobId, resumeUrl } = req.body;

    // Check if the student has already applied to this specific job
    const existingApplication = await Application.findOne({ job: jobId, student: req.user._id });
    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied to this job' });
    }

    const application = await Application.create({
      job: jobId,
      student: req.user._id,
      resumeUrl,
      status: 'Applied'
    });

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update application status (and add interview details)
// @route   PUT /api/applications/:id/status
// @access  Private (Companies and Admins)
router.put('/:id/status', protect, async (req, res) => {
  try {
    // Security check: Only companies and admins can change applicant statuses
    if (req.user.role !== 'company' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update application status' });
    }

    const { status, interviewDate, interviewTime, interviewLink } = req.body;
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Update the status
    application.status = status;
    
    // If scheduling an interview, attach those details
    if (interviewDate) application.interviewDate = interviewDate;
    if (interviewTime) application.interviewTime = interviewTime;
    if (interviewLink) application.interviewLink = interviewLink;

    await application.save();
    res.status(200).json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete/Terminate/Withdraw an application
// @route   DELETE /api/applications/:id
// @access  Private (Admins or the Owning Student)
router.delete('/:id', protect, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // SECURITY CHECK: Is it an Admin, OR is it the student who owns this application?
    if (req.user.role !== 'admin' && application.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this application' });
    }
    
    await application.deleteOne();
    res.status(200).json({ message: 'Application successfully removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;