const mongoose = require('mongoose');

const driveSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    // Example: "Campus Placement Drive 2026"
  },
  description: { 
    type: String 
  },
  academicYear: {
    type: String,
    default: '2025-2026'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  status: { 
    type: String, 
    enum: ['Upcoming', 'Active', 'Completed'], 
    default: 'Active' 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('Drive', driveSchema);