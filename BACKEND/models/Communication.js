const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Announcement', 'Interview Update', 'Round Result', 'Urgent Notice', 'General Guidance'],
    default: 'Announcement'
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['admin', 'company'],
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  // Targeting
  targetAudience: {
    type: String,
    enum: ['All Students', 'Job Applicants', 'Shortlisted Candidates', 'Specific Department'],
    default: 'All Students'
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  drive: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Drive'
  },
  targetDepartment: {
    type: String,
    default: 'ALL'
  },
  actionUrl: {
    type: String,
    default: ''
  },
  isUrgent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Communication', communicationSchema);
