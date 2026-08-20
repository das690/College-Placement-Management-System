const express = require('express');
const router = express.Router();
const Drive = require('../models/Drive');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get placement drives (All for logged in users)
// @route   GET /api/drives
// @access  Public or Private
router.get('/', async (req, res) => {
  try {
    const drives = await Drive.find().sort({ createdAt: -1 });
    res.status(200).json(drives);
  } catch (error) {
    console.error('GET /api/drives error:', error.message);
    res.status(500).json({ message: 'Unable to fetch placement drives. Please try again later.' });
  }
});

// @desc    Create a new placement drive
// @route   POST /api/drives
// @access  Private (Admin only)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can initialize placement drives.' });
    }

    const { name, description, academicYear, startDate, endDate, status } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: 'Placement Drive Name is required (minimum 3 characters).' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (startDate && startDate < todayStr) {
      return res.status(400).json({ message: 'Drive Start Date cannot be set in the past.' });
    }
    if (endDate && startDate && endDate < startDate) {
      return res.status(400).json({ message: 'Drive End Date cannot be earlier than Start Date.' });
    }

    const drive = await Drive.create({
      name: name.trim(),
      description: description || '',
      academicYear: academicYear || '2025-2026',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || 'Active',
      createdBy: req.user.id
    });

    res.status(201).json(drive);
  } catch (error) {
    console.error('POST /api/drives error:', error.message);
    res.status(500).json({ message: 'Failed to create placement drive. Please try again later.' });
  }
});

// @desc    Update a placement drive
// @route   PUT /api/drives/:id
// @access  Private (Admin only)
router.put('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can update placement drives.' });
    }

    const drive = await Drive.findById(req.params.id);
    if (!drive) return res.status(404).json({ message: 'Placement Drive not found.' });

    const { name, description, academicYear, startDate, endDate, status } = req.body;

    if (name !== undefined) {
      if (name.trim().length < 3) {
        return res.status(400).json({ message: 'Drive Name must be at least 3 characters long.' });
      }
      drive.name = name.trim();
    }

    if (description !== undefined) drive.description = description;
    if (academicYear !== undefined) drive.academicYear = academicYear;
    if (status !== undefined) drive.status = status;

    const newStartDate = startDate !== undefined ? startDate : drive.startDate;
    const newEndDate = endDate !== undefined ? endDate : drive.endDate;

    if (startDate && endDate && endDate < startDate) {
      return res.status(400).json({ message: 'Drive End Date cannot be earlier than Start Date.' });
    }

    if (startDate !== undefined) drive.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) drive.endDate = endDate ? new Date(endDate) : null;

    await drive.save();
    res.status(200).json(drive);
  } catch (error) {
    console.error('PUT /api/drives/:id error:', error.message);
    res.status(500).json({ message: 'Failed to update placement drive. Please try again later.' });
  }
});

// @desc    Delete a placement drive
// @route   DELETE /api/drives/:id
// @access  Private (Admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete placement drives.' });
    }

    const drive = await Drive.findById(req.params.id);
    if (!drive) return res.status(404).json({ message: 'Placement Drive not found.' });

    await drive.deleteOne();
    res.status(200).json({ message: 'Placement Drive removed successfully.' });
  } catch (error) {
    console.error('DELETE /api/drives/:id error:', error.message);
    res.status(500).json({ message: 'Failed to delete placement drive. Please try again later.' });
  }
});

module.exports = router;