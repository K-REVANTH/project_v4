const express = require('express');
const LabTest = require('../models/LabTest');
const LabBooking = require('../models/LabBooking');

const router = express.Router();

// List available lab tests
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

// Add a lab test (admin)
router.post('/', async (req, res) => {
  try {
    const test = new LabTest(req.body);
    await test.save();
    res.status(201).json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Book a lab test
router.post('/book', async (req, res) => {
  try {
    const { testId, patientId, patientName, scheduledDate } = req.body;

    const test = await LabTest.findById(testId);
    if (!test) return res.status(404).json({ error: 'Lab test not found' });

    const booking = new LabBooking({ testId, patientId, patientName, scheduledDate });
    await booking.save();

    // Publish event
    if (req.app.locals.publishEvent) {
      req.app.locals.publishEvent('lab.booked', {
        bookingId: booking._id,
        testId,
        testName: test.name,
        patientId,
        patientName,
        scheduledDate
      });
    }

    res.status(201).json({ message: 'Lab test booked', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bookings by patient
router.get('/bookings/:patientId', async (req, res) => {
  try {
    const bookings = await LabBooking.find({ patientId: req.params.patientId })
      .populate('testId', 'name category labName price');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
