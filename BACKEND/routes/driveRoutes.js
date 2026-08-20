const express = require('express');
const router = express.Router();
const Drive = require('../models/Drive');
const { protect } = require('../middleware/authMiddleware'); // Assuming you have this middleware

// @desc    Get placement drives (All for logged in users)
// @route   GET /api/drives
// @access  Public or Private
router.get('/', async (req, res) => {
  try {
    const drives = await Drive.find().sort({ createdAt: -1 });
    res.status(200).json(drives);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a new placement drive
// @route   POST /api/drives
// @access  Private (Admin only)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create placement drives' });
    }

    const { name, description, academicYear, startDate, endDate, status } = req.body;
    const todayStr = new Date().toISOString().split('T')[0];

    if (startDate && startDate < todayStr) {
      return res.status(400).json({ message: 'Drive Start Date cannot be set in the past.' });
    }
    if (endDate && startDate && endDate < startDate) {
      return res.status(400).json({ message: 'Drive End Date cannot be earlier than Start Date.' });
    }
    if (endDate && endDate < todayStr) {
      return res.status(400).json({ message: 'Drive End Date cannot be set in the past.' });
    }

    const drive = await Drive.create({
      name,
      description,
      academicYear: academicYear || '2025-2026',
      startDate,
      endDate,
      status: status || 'Active',
      createdBy: req.user.id
    });

    res.status(201).json(drive);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update a placement drive
// @route   PUT /api/drives/:id
// @access  Private (Admin only)
router.put('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update placement drives' });
    }

    const drive = await Drive.findById(req.params.id);
    if (!drive) return res.status(404).json({ message: 'Drive not found' });

    const todayStr = new Date().toISOString().split('T')[0];
    const newStartDate = req.body.startDate || drive.startDate;
    const newEndDate = req.body.endDate || drive.endDate;

    if (req.body.startDate && req.body.startDate < todayStr) {
      return res.status(400).json({ message: 'Drive Start Date cannot be set in the past.' });
    }
    if (newEndDate && newStartDate && newEndDate < newStartDate) {
      return res.status(400).json({ message: 'Drive End Date cannot be earlier than Start Date.' });
    }

    if (req.body.name) drive.name = req.body.name;
    if (req.body.description !== undefined) drive.description = req.body.description;
    if (req.body.academicYear) drive.academicYear = req.body.academicYear;
    if (req.body.status) drive.status = req.body.status;
    if (req.body.startDate) drive.startDate = req.body.startDate;
    if (req.body.endDate) drive.endDate = req.body.endDate;

    await drive.save();
    res.status(200).json(drive);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a placement drive
// @route   DELETE /api/drives/:id
// @access  Private (Admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete placement drives' });
    }

    const drive = await Drive.findById(req.params.id);
    if (!drive) return res.status(404).json({ message: 'Drive not found' });

    await drive.deleteOne();
    res.status(200).json({ message: 'Placement Drive removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;