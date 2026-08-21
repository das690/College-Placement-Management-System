const express = require('express');
const router = express.Router();
const Communication = require('../models/Communication');
const Application = require('../models/Application');
const Job = require('../models/Job');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get all relevant communications / announcements
// @route   GET /api/communications
// @access  Private (All logged-in roles)
router.get('/', protect, async (req, res) => {
  try {
    let communications = [];

    if (req.user.role === 'admin') {
      // Admins see all announcements and broadcasts
      communications = await Communication.find()
        .populate('job', 'title company location')
        .populate('drive', 'name academicYear')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'company') {
      // Companies see announcements they posted + college admin general announcements
      communications = await Communication.find({
        $or: [
          { sender: req.user._id },
          { senderRole: 'admin' }
        ]
      })
      .populate('job', 'title company location')
      .populate('drive', 'name academicYear')
      .sort({ createdAt: -1 });
    } else if (req.user.role === 'student') {
      // Students see:
      // 1. All general announcements for "All Students"
      // 2. Announcements for their specific department
      // 3. Announcements for jobs they have applied to
      const studentDept = req.user.academicDetails?.department || '';
      
      // Get all jobs student applied to
      const studentApps = await Application.find({ student: req.user._id }).select('job status');
      const appliedJobIds = studentApps.map(a => a.job);
      const shortlistedJobIds = studentApps
        .filter(a => ['Shortlisted', 'Assessment Round', 'Technical Interview', 'HR Interview', 'Selected', 'Hired'].includes(a.status))
        .map(a => a.job);

      communications = await Communication.find({
        $or: [
          { targetAudience: 'All Students' },
          { targetAudience: 'Specific Department', targetDepartment: { $regex: new RegExp(`^${studentDept}$`, 'i') } },
          { targetAudience: 'Specific Department', targetDepartment: 'ALL' },
          { targetAudience: 'Job Applicants', job: { $in: appliedJobIds } },
          { targetAudience: 'Shortlisted Candidates', job: { $in: shortlistedJobIds } }
        ]
      })
      .populate('job', 'title company location')
      .populate('drive', 'name academicYear')
      .sort({ createdAt: -1 });
    }

    res.status(200).json(communications);
  } catch (error) {
    console.error('GET /api/communications error:', error);
    res.status(500).json({ message: 'Failed to fetch announcements: ' + error.message });
  }
});

// @desc    Post a new announcement / broadcast message
// @route   POST /api/communications
// @access  Private (Admins & Companies)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'company') {
      return res.status(403).json({ message: 'Only Administrators and Recruiting Companies can broadcast communications.' });
    }

    const { 
      title, 
      message, 
      type, 
      targetAudience, 
      jobId, 
      driveId, 
      targetDepartment, 
      actionUrl, 
      isUrgent 
    } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({ message: 'Announcement Title is required (at least 3 characters).' });
    }

    if (!message || message.trim().length < 10) {
      return res.status(400).json({ message: 'Detailed message body is required (at least 10 characters).' });
    }

    // Verify job belongs to company if company role
    if (req.user.role === 'company' && jobId) {
      const job = await Job.findById(jobId);
      if (!job || job.company.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only broadcast messages targeting your own posted positions.' });
      }
    }

    const communication = await Communication.create({
      title: title.trim(),
      message: message.trim(),
      type: type || 'Announcement',
      sender: req.user._id,
      senderRole: req.user.role,
      senderName: req.user.name,
      targetAudience: targetAudience || 'All Students',
      job: jobId || undefined,
      drive: driveId || undefined,
      targetDepartment: targetDepartment || 'ALL',
      actionUrl: actionUrl || '',
      isUrgent: !!isUrgent
    });

    const populated = await Communication.findById(communication._id)
      .populate('job', 'title company location')
      .populate('drive', 'name academicYear');

    res.status(201).json(populated);
  } catch (error) {
    console.error('POST /api/communications error:', error);
    res.status(500).json({ message: 'Failed to publish announcement: ' + error.message });
  }
});

// @desc    Delete an announcement
// @route   DELETE /api/communications/:id
// @access  Private (Admins or Owning Company)
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await Communication.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }

    if (req.user.role !== 'admin' && item.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to remove this announcement.' });
    }

    await item.deleteOne();
    res.status(200).json({ message: 'Announcement deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/communications/:id error:', error);
    res.status(500).json({ message: 'Failed to delete announcement: ' + error.message });
  }
});

module.exports = router;
