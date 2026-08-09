const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  requirements: { type: String, required: true },
  location: { type: String, required: true },
  salary: { type: String },
  
  // Structural Linking
  company: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  drive: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Drive', 
    required: true // A job MUST belong to a placement drive now
  },

  // Strict Eligibility Criteria
  eligibility: {
    minCgpa: { type: Number, default: 0 },
    allowedDepartments: [{ type: String }], // Array of eligible departments
    maxBacklogs: { type: Number, default: 0 },
    targetGraduationYear: { type: Number } // e.g. 2026
  }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);