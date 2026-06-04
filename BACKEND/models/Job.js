const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Links this job to the Company user who posted it
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a job title']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  requirements: {
    type: String, // Can be a comma-separated list or plain text
    required: [true, 'Please add job requirements']
  },
  location: {
    type: String,
    required: [true, 'Please add a location (e.g., Remote, On-site, City)']
  },
  salary: {
    type: String,
    default: 'Not Disclosed'
  },
  status: {
    type: String,
    enum: ['Open', 'Closed'],
    default: 'Open'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Job', JobSchema);