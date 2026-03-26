const express = require('express');
const LabTest = require('../models/LabTest');
const LabBooking = require('../models/LabBooking');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ─── Public Routes ───

// List available lab tests (public)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isAvailable: true };
    if (category) filter.category = category;
    const tests = await LabTest.find(filter);
    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Protected Routes ───

// Add a lab test (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const test = new LabTest(req.body);
    await test.save();
    res.status(201).json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Book a lab test (patient or admin)
router.post('/book', authenticate, authorize('patient', 'admin'), async (req, res) => {
  try {
    const { testId, patientId, patientName, scheduledDate } = req.body;

    const test = await LabTest.findById(testId);
    if (!test) return res.status(404).json({ error: 'Lab test not found' });

    // Patients can only book for themselves
    const actualPatientId = req.user.role === 'patient' ? req.user.id : patientId;
    const actualPatientName = req.user.role === 'patient' ? req.user.name : patientName;

    const booking = new LabBooking({
      testId,
      patientId: actualPatientId,
      patientName: actualPatientName,
      scheduledDate
    });
    await booking.save();

    if (req.app.locals.publishEvent) {
      req.app.locals.publishEvent('lab.booked', {
        bookingId: booking._id,
        testId,
        testName: test.name,
        patientId: actualPatientId,
        patientName: actualPatientName,
        scheduledDate
      });
    }

    res.status(201).json({ message: 'Lab test booked', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bookings — role-aware
router.get('/bookings/list', authenticate, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'patient') {
      filter.patientId = req.user.id;
    }
    // Doctor and admin can see all
    const bookings = await LabBooking.find(filter)
      .populate('testId', 'name category labName price')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bookings by patient (backward compat)
router.get('/bookings/:patientId', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'patient' && req.user.id !== req.params.patientId) {
      return res.status(403).json({ error: 'Patients can only view their own bookings' });
    }
    const bookings = await LabBooking.find({ patientId: req.params.patientId })
      .populate('testId', 'name category labName price');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
