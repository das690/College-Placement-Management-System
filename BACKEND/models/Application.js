const mongoose = require('mongoose');

const roundEvaluationSchema = new mongoose.Schema({
  roundName: { 
    type: String, 
    required: true,
    trim: true
    // e.g. "Online Aptitude Test", "Technical Interview Round 1", "Managerial & HR Round"
  },
  roundNumber: { 
    type: Number, 
    default: 1 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Cleared', 'Failed', 'On-Hold'], 
    default: 'Pending' 
  },
  score: { 
    type: String, 
    default: '' // e.g. "88/100" or "4.5/5"
  },
  feedback: { 
    type: String, 
    default: '' // e.g. "Solid fundamentals in Data Structures & System Architecture."
  },
  evaluator: { 
    type: String, 
    default: 'Recruitment Team' 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: true });

const applicationSchema = new mongoose.Schema({
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
    enum: ['Applied', 'Shortlisted', 'Assessment Round', 'Technical Interview', 'HR Interview', 'Selected', 'Rejected', 'Reviewed', 'Interview Scheduled', 'Hired', 'Terminated', 'Withdrawn'], 
    default: 'Applied' 
  },
  interviewDate: { type: String },
  interviewTime: { type: String },
  interviewLink: { type: String },
  
  // Structured Multi-Round Feedback & Evaluation Pipeline
  rounds: [roundEvaluationSchema]
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);