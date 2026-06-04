const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  resumeUrl: {
    type: String,
    required: true,
  },
  // --- NEW INTERVIEW FIELDS ---
  interviewDate: {
    type: String,
    default: null
  },
  interviewTime: {
    type: String,
    default: null
  },
  interviewLink: {
    type: String,
    default: null
  },
  // ----------------------------
  status: {
    type: String,
    enum: ['Applied', 'Reviewed', 'Shortlisted', 'Interview Scheduled', 'Hired', 'Rejected'],
    default: 'Applied',
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Application', applicationSchema);