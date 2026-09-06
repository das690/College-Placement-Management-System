const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['student', 'company', 'admin'], 
    default: 'student' 
  },
  
  // Academic Profile for Students
  academicDetails: {
    department: { type: String }, // e.g., "Computer Science"
    graduationYear: { type: Number }, // e.g., 2026
    cgpa: { type: Number },
    activeBacklogs: { type: Number, default: 0 },
    skills: [{ type: String }],
    certifications: [{ type: String }],
    resumeUrl: { type: String }
  },

  // Company Profile
  companyDetails: {
    industry: { type: String },
    size: { type: String },
    website: { type: String },
    verified: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);