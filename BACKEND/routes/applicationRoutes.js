const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware'); 

// @desc    Get applications (Role-based filtering)
// @route   GET /api/applications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let applications;
    
    if (req.user.role === 'admin') {
      // Admins see everything, populated with job, drive and student details
      applications = await Application.find()
        .populate('drive', 'name status academicYear')
        .populate({ path: 'job', populate: { path: 'company', select: 'name' }})
        .populate('student', 'name email academicDetails');
    } else if (req.user.role === 'student') {
      // Students only see their own applications
      applications = await Application.find({ student: req.user.id })
        .populate('drive', 'name status academicYear')
        .populate({ path: 'job', populate: { path: 'company', select: 'name' }});
    } else if (req.user.role === 'company') {
      // Companies only see applications targeting their specific jobs
      const jobs = await Job.find({ company: req.user.id }).select('_id');
      const jobIds = jobs.map(job => job._id);
      applications = await Application.find({ job: { $in: jobIds } })
        .populate('drive', 'name status academicYear')
        .populate('job')
        .populate('student', 'name email academicDetails');
    }

    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Submit a new application (ELIGIBILITY ENGINE)
// @route   POST /api/applications
// @access  Private (Students only)
router.post('/', protect, async (req, res) => {
  try {
    const { jobId, resumeUrl } = req.body;
    
    // 1. Fetch the Job and the Student
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job position not found' });

    const student = await User.findById(req.user.id);
    const { academicDetails } = student;

    // 2. Detailed Profile Completion Check
    const missing = [];
    if (!academicDetails?.department) missing.push('Department');
    if (academicDetails?.cgpa === undefined || academicDetails?.cgpa === null || academicDetails?.cgpa === '') missing.push('CGPA');
    if (!academicDetails?.graduationYear) missing.push('Graduation Year');
    if (!resumeUrl && !academicDetails?.resumeUrl) missing.push('Resume PDF');

    if (missing.length > 0) {
       return res.status(400).json({ 
         message: `Academic profile incomplete. Missing required field(s): ${missing.join(', ')}. Please update your profile before applying.` 
       });
    }

    // 3. ELIGIBILITY ENGINE CHECKS
    const { minCgpa, maxBacklogs, allowedDepartments, targetGraduationYear } = job.eligibility || {};

    // Check CGPA
    if (minCgpa !== undefined && academicDetails.cgpa < minCgpa) {
       return res.status(403).json({ message: `Not eligible: Minimum CGPA required is ${minCgpa}. Yours is ${academicDetails.cgpa}.` });
    }

    // Check Backlogs
    if (maxBacklogs !== undefined && academicDetails.activeBacklogs > maxBacklogs) {
       return res.status(403).json({ message: `Not eligible: Maximum allowed backlogs is ${maxBacklogs}. You have ${academicDetails.activeBacklogs}.` });
    }

    // Check Department (if restricted)
    if (allowedDepartments && allowedDepartments.length > 0) {
       if (!allowedDepartments.includes(academicDetails.department)) {
         return res.status(403).json({ message: `Not eligible: This role is restricted to specific departments: ${allowedDepartments.join(', ')}.` });
       }
    }

    // Check Target Graduation Year (if specified)
    if (targetGraduationYear && Number(academicDetails.graduationYear) !== Number(targetGraduationYear)) {
       return res.status(403).json({ message: `Not eligible: Target graduation year for this role is ${targetGraduationYear}. Your graduation year is ${academicDetails.graduationYear}.` });
    }

    // 4. Check for duplicate application
    const existingApplication = await Application.findOne({ job: jobId, student: req.user.id });
    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied for this position.' });
    }

    // 5. Success! Create the application linked to the Placement Drive
    const application = await Application.create({
      drive: job.drive, 
      job: jobId,
      student: req.user.id,
      resumeUrl: resumeUrl || academicDetails.resumeUrl || 'Not provided'
    });

    const populatedApp = await Application.findById(application._id)
      .populate('drive', 'name status academicYear')
      .populate({ path: 'job', populate: { path: 'company', select: 'name' }})
      .populate('student', 'name email academicDetails');

    res.status(201).json(populatedApp);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update application status (HR/Admin)
// @route   PUT /api/applications/:id/status
// @access  Private
router.put('/:id/status', protect, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    
    // Update core status
    application.status = req.body.status;
    
    // Update interview details if provided
    if (req.body.interviewDate) application.interviewDate = req.body.interviewDate;
    if (req.body.interviewTime) application.interviewTime = req.body.interviewTime;
    if (req.body.interviewLink) application.interviewLink = req.body.interviewLink;

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