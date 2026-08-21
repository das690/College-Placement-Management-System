const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware'); 

// Standard Department Aliases for resilient matching
const DEPARTMENT_ALIASES = {
  'cse': ['computer science', 'computer science & engineering', 'computer science and engineering', 'cse', 'cs'],
  'it': ['information technology', 'it', 'info tech'],
  'ece': ['electronics & communication', 'electronics and communication engineering', 'ece', 'electronics & communication engineering'],
  'eee': ['electrical & electronics', 'electrical and electronics engineering', 'eee', 'electrical & electronics engineering'],
  'mech': ['mechanical', 'mechanical engineering', 'mech', 'me'],
  'civil': ['civil', 'civil engineering', 'ce'],
  'aids': ['artificial intelligence & data science', 'artificial intelligence and data science', 'ai & data science', 'ai and ds', 'aids', 'ai/ds'],
  'aiml': ['artificial intelligence & machine learning', 'artificial intelligence and machine learning', 'ai & machine learning', 'aiml', 'ai/ml'],
  'csbs': ['computer science & business systems', 'computer science and business systems', 'csbs'],
  'auto': ['automobile', 'automobile engineering', 'auto'],
  'biotech': ['biotechnology', 'biotech', 'bio technology', 'bt']
};

const normalizeDept = (dept) => {
  if (!dept) return '';
  const clean = String(dept).toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [canonical, aliases] of Object.entries(DEPARTMENT_ALIASES)) {
    if (canonical === clean) return canonical;
    for (const alias of aliases) {
      if (alias.toLowerCase().replace(/[^a-z0-9]/g, '') === clean) {
        return canonical;
      }
    }
  }
  return clean;
};

const isDeptEligible = (studentDept, allowedDepts) => {
  if (!allowedDepts || allowedDepts.length === 0) return true;
  if (!studentDept) return false;
  const normStudent = normalizeDept(studentDept);
  return allowedDepts.some(d => {
    if (String(d).toLowerCase().trim() === 'all' || String(d).toLowerCase().trim() === 'all departments') return true;
    return normalizeDept(d) === normStudent;
  });
};

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
        .populate({ path: 'job', populate: { path: 'company', select: 'name email' }})
        .populate('student', 'name email academicDetails')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'student') {
      // Students only see their own applications
      applications = await Application.find({ student: req.user.id })
        .populate('drive', 'name status academicYear')
        .populate({ path: 'job', populate: { path: 'company', select: 'name email' }})
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'company') {
      // Companies only see applications targeting their specific jobs
      const jobs = await Job.find({ company: req.user.id }).select('_id');
      const jobIds = jobs.map(job => job._id);
      applications = await Application.find({ job: { $in: jobIds } })
        .populate('drive', 'name status academicYear')
        .populate('job')
        .populate('student', 'name email academicDetails')
        .sort({ createdAt: -1 });
    }

    res.status(200).json(applications);
  } catch (error) {
    console.error('GET /api/applications error:', error.message);
    res.status(500).json({ message: 'Unable to fetch applications. Please try again later.' });
  }
});

// @desc    Submit a new application (ELIGIBILITY ENGINE WITH SMART MATCHING)
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

    // 3. ELIGIBILITY ENGINE CHECKS WITH NORMALIZATION
    const { minCgpa, maxBacklogs, allowedDepartments, targetGraduationYear } = job.eligibility || {};

    // Check CGPA
    if (minCgpa !== undefined && Number(minCgpa) > 0 && academicDetails.cgpa < minCgpa) {
       return res.status(403).json({ message: `Not eligible: Minimum CGPA required is ${minCgpa}. Yours is ${academicDetails.cgpa}.` });
    }

    // Check Backlogs
    if (maxBacklogs !== undefined && academicDetails.activeBacklogs > maxBacklogs) {
       return res.status(403).json({ message: `Not eligible: Maximum allowed backlogs is ${maxBacklogs}. You have ${academicDetails.activeBacklogs}.` });
    }

    // Check Department (Using Smart Normalization)
    if (allowedDepartments && allowedDepartments.length > 0) {
       if (!isDeptEligible(academicDetails.department, allowedDepartments)) {
         return res.status(403).json({ 
           message: `Not eligible: This role is restricted to: ${allowedDepartments.join(', ')}. Your department is ${academicDetails.department}.` 
         });
       }
    }

    // Check Target Graduation Year (if specified)
    if (targetGraduationYear && Number(academicDetails.graduationYear) !== Number(targetGraduationYear)) {
       return res.status(403).json({ 
         message: `Not eligible: Target graduation year for this role is ${targetGraduationYear}. Your graduation year is ${academicDetails.graduationYear}.` 
       });
    }

    // 4. Check for duplicate application
    const existingApplication = await Application.findOne({ job: jobId, student: req.user.id });
    if (existingApplication) {
      if (existingApplication.status === 'Withdrawn') {
        // Allow re-applying if previously withdrawn
        existingApplication.status = 'Applied';
        existingApplication.resumeUrl = resumeUrl || academicDetails.resumeUrl || existingApplication.resumeUrl;
        await existingApplication.save();
        
        const repopulated = await Application.findById(existingApplication._id)
          .populate('drive', 'name status academicYear')
          .populate({ path: 'job', populate: { path: 'company', select: 'name email' }})
          .populate('student', 'name email academicDetails');

        return res.status(200).json(repopulated);
      }
      return res.status(400).json({ message: 'You have already applied for this position.' });
    }

    // 5. Success! Create the application linked to the Placement Drive
    const application = await Application.create({
      drive: job.drive, 
      job: jobId,
      student: req.user.id,
      resumeUrl: resumeUrl || academicDetails.resumeUrl || 'Not provided',
      rounds: [
        {
          roundName: 'Application Screening',
          roundNumber: 1,
          status: 'Cleared',
          score: 'Eligible',
          feedback: 'Candidate meets all baseline eligibility criteria.',
          evaluator: 'Automated Eligibility Engine',
          updatedAt: new Date()
        }
      ]
    });

    const populatedApp = await Application.findById(application._id)
      .populate('drive', 'name status academicYear')
      .populate({ path: 'job', populate: { path: 'company', select: 'name email' }})
      .populate('student', 'name email academicDetails');

    res.status(201).json(populatedApp);
  } catch (error) {
    console.error('POST /api/applications error:', error.message);
    res.status(500).json({ message: 'Failed to submit your application. Please try again later.' });
  }
});

// @desc    Update application status (HR/Admin) - WITHDRAWN GUARD PROTECTED
// @route   PUT /api/applications/:id/status
// @access  Private (Companies or Admins)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    
    // WITHDRAWN GUARD: Prevent company/admin from altering status if candidate has withdrawn
    if (application.status === 'Withdrawn' && req.user.role !== 'student') {
      return res.status(400).json({ 
        message: 'Cannot modify application status. The candidate has already withdrawn this application.' 
      });
    }

    // Update core status
    if (req.body.status) {
      if (application.status === 'Withdrawn' && req.body.status !== 'Withdrawn' && req.user.role !== 'student') {
        return res.status(400).json({ message: 'Cannot reopen or modify a withdrawn application.' });
      }
      application.status = req.body.status;
    }
    
    // Update interview details if provided (validate past date)
    if (req.body.interviewDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (req.body.interviewDate < todayStr) {
        return res.status(400).json({ message: 'Interview date cannot be scheduled in the past.' });
      }
      application.interviewDate = req.body.interviewDate;
    }
    if (req.body.interviewTime) application.interviewTime = req.body.interviewTime;
    if (req.body.interviewLink) application.interviewLink = req.body.interviewLink;

    await application.save();
    
    const populatedApp = await Application.findById(application._id)
      .populate('drive', 'name status academicYear')
      .populate({ path: 'job', populate: { path: 'company', select: 'name email' }})
      .populate('student', 'name email academicDetails');

    res.status(200).json(populatedApp);
  } catch (error) {
    console.error('PUT /api/applications/:id/status error:', error.message);
    res.status(500).json({ message: 'Failed to update application status. Please try again.' });
  }
});

// @desc    Add or Update Round Evaluation & Feedback
// @route   POST /api/applications/:id/rounds
// @access  Private (Companies or Admins)
router.post('/:id/rounds', protect, async (req, res) => {
  try {
    if (req.user.role !== 'company' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only recruiters and administrators can add round evaluations.' });
    }

    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    if (application.status === 'Withdrawn') {
      return res.status(400).json({ message: 'Cannot add evaluations for a withdrawn application.' });
    }

    const { roundId, roundName, roundNumber, status, score, feedback, evaluator } = req.body;

    if (!roundName || roundName.trim().length < 2) {
      return res.status(400).json({ message: 'Round Name is required (e.g. Technical Round 1).' });
    }

    if (roundId) {
      // Update existing round
      const existingRound = application.rounds.id(roundId);
      if (existingRound) {
        existingRound.roundName = roundName.trim();
        if (roundNumber !== undefined) existingRound.roundNumber = Number(roundNumber);
        if (status) existingRound.status = status;
        if (score !== undefined) existingRound.score = score.trim();
        if (feedback !== undefined) existingRound.feedback = feedback.trim();
        if (evaluator) existingRound.evaluator = evaluator.trim();
        existingRound.updatedAt = new Date();
      } else {
        return res.status(404).json({ message: 'Round evaluation record not found.' });
      }
    } else {
      // Add new round evaluation
      application.rounds.push({
        roundName: roundName.trim(),
        roundNumber: roundNumber ? Number(roundNumber) : application.rounds.length + 1,
        status: status || 'Pending',
        score: score ? score.trim() : '',
        feedback: feedback ? feedback.trim() : '',
        evaluator: evaluator ? evaluator.trim() : req.user.name,
        updatedAt: new Date()
      });
    }

    await application.save();

    const populatedApp = await Application.findById(application._id)
      .populate('drive', 'name status academicYear')
      .populate({ path: 'job', populate: { path: 'company', select: 'name email' }})
      .populate('student', 'name email academicDetails');

    res.status(200).json(populatedApp);
  } catch (error) {
    console.error('POST /api/applications/:id/rounds error:', error.message);
    res.status(500).json({ message: 'Failed to record round evaluation: ' + error.message });
  }
});

// @desc    Delete a Round Evaluation
// @route   DELETE /api/applications/:id/rounds/:roundId
// @access  Private (Companies or Admins)
router.delete('/:id/rounds/:roundId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'company' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete round evaluations.' });
    }

    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found.' });

    application.rounds = application.rounds.filter(r => r._id.toString() !== req.params.roundId);
    await application.save();

    const populatedApp = await Application.findById(application._id)
      .populate('drive', 'name status academicYear')
      .populate({ path: 'job', populate: { path: 'company', select: 'name email' }})
      .populate('student', 'name email academicDetails');

    res.status(200).json(populatedApp);
  } catch (error) {
    console.error('DELETE /api/applications/:id/rounds/:roundId error:', error.message);
    res.status(500).json({ message: 'Failed to delete round evaluation: ' + error.message });
  }
});

// @desc    Soft-terminate / Withdraw an application (Preserve analytics data)
// @route   DELETE /api/applications/:id
// @access  Private (Admins, Companies, or Owning Student)
router.delete('/:id', protect, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // SECURITY CHECK: Is it an Admin, Company, OR the student who owns this application?
    if (req.user.role !== 'admin' && req.user.role !== 'company' && application.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to modify this application' });
    }
    
    // Soft-terminate status to preserve application submission records for drive analytics
    if (req.user.role === 'student' && application.student.toString() === req.user.id) {
      application.status = 'Withdrawn';
      // Append withdrawal note to rounds
      application.rounds.push({
        roundName: 'Application Withdrawal',
        roundNumber: application.rounds.length + 1,
        status: 'On-Hold',
        score: 'Withdrawn',
        feedback: 'Candidate opted to voluntarily withdraw application.',
        evaluator: req.user.name,
        updatedAt: new Date()
      });
    } else {
      application.status = 'Terminated';
    }

    await application.save();

    const populatedApp = await Application.findById(application._id)
      .populate('drive', 'name status academicYear')
      .populate({ path: 'job', populate: { path: 'company', select: 'name email' }})
      .populate('student', 'name email academicDetails');

    res.status(200).json({ 
      message: `Application marked as ${application.status}. Record preserved in drive reports & analytics.`,
      application: populatedApp
    });
  } catch (error) {
    console.error('DELETE /api/applications/:id error:', error.message);
    res.status(500).json({ message: 'Failed to process application withdrawal. Please try again.' });
  }
});

module.exports = router;