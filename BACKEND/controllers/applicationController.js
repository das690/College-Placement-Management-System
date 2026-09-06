const Application = require('../models/Application');
const Job = require('../models/Job');
const { generateMockMeetingLink } = require('../utils/videoService');
const { sendEmailNotification, sendSmsNotification } = require('../utils/notificationService');

// @desc    Apply for a job
// @route   POST /api/applications
// @access  Private (Only Students)
const applyForJob = async (req, res) => {
  try {
    // Now we are expecting BOTH a jobId and a resumeUrl from the frontend
    const { jobId, resumeUrl } = req.body;

    // Check if the student already applied
    const existingApplication = await Application.findOne({
      job: jobId,
      student: req.user._id,
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied for this job' });
    }

    if (!resumeUrl) {
      return res.status(400).json({ message: 'A resume is required to apply' });
    }

    // Create the application with the resume included
    const application = await Application.create({
      job: jobId,
      student: req.user._id,
      resumeUrl: resumeUrl, // Save the Cloudinary link here!
    });

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get applications (Students see their own, Companies see apps for their jobs)
// @route   GET /api/applications
// @access  Private
const getApplications = async (req, res) => {
  try {
    let applications;

    if (req.user.role === 'student') {
      // If student, find all applications where they are the applicant
      applications = await Application.find({ student: req.user._id })
        .populate('job', 'title company location'); // Bring in job details
    } else if (req.user.role === 'company') {
      // If company, first find all jobs they posted
      const companyJobs = await Job.find({ company: req.user._id }).select('_id');
      const jobIds = companyJobs.map(job => job._id);

      // Then find all applications that match those job IDs
      applications = await Application.find({ job: { $in: jobIds } })
        .populate('student', 'name email'); // Bring in student details
    } else {
      // Admins see everything
      applications = await Application.find()
        .populate('student', 'name email')
        .populate('job', 'title company');
    }

    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Private (Only Companies or Admins)
const updateApplicationStatus = async (req, res) => {
  try {
    // Now we extract the status AND the optional interview details
    const { status, interviewDate, interviewTime, interviewLink } = req.body;
    
    const application = await Application.findById(req.params.id)
      .populate('student', 'name email')
      .populate('job', 'title');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Update the basic status
    application.status = status;

    // If they sent interview details, save those too!
    if (interviewDate) application.interviewDate = interviewDate;
    if (interviewTime) application.interviewTime = interviewTime;
    
    // Automatically generate video link if scheduled, or use provided
    if (status === 'Interview Scheduled') {
      application.interviewLink = interviewLink || generateMockMeetingLink();
      
      // Trigger Notifications
      const emailSubject = `Interview Scheduled: ${application.job.title}`;
      const emailText = `Hello ${application.student.name},\n\nYour interview for ${application.job.title} has been scheduled.\nDate: ${application.interviewDate}\nTime: ${application.interviewTime}\nJoin Link: ${application.interviewLink}\n\nGood luck!`;
      
      await sendEmailNotification(application.student.email, emailSubject, emailText);
      await sendSmsNotification("+1234567890", `Interview scheduled for ${application.job.title} on ${application.interviewDate} at ${application.interviewTime}. Check email for link.`);
    } else if (status === 'Selected') {
      await sendEmailNotification(application.student.email, `Congratulations! Selected for ${application.job.title}`, `Hello ${application.student.name}, you have been selected for the position!`);
    } else if (status === 'Rejected') {
      await sendEmailNotification(application.student.email, `Update on your application for ${application.job.title}`, `Hello ${application.student.name}, unfortunately we are moving forward with other candidates.`);
    } else if (interviewLink) {
       application.interviewLink = interviewLink;
    }

    await application.save();

    res.status(200).json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { applyForJob, getApplications, updateApplicationStatus };