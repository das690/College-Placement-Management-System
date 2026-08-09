const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // Linking to the Drive for Analytics
  drive: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Drive',
    required: true
  },
  job: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Job', 
    required: true 
  },
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  resumeUrl: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Applied', 'Shortlisted', 'Assessment Round', 'Technical Interview', 'HR Interview', 'Selected', 'Rejected', 'Reviewed', 'Interview Scheduled', 'Hired'], 
    default: 'Applied' 
  },
  interviewDate: { type: String },
  interviewTime: { type: String },
  interviewLink: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);