const express = require('express');
const AmbulanceBooking = require('../models/AmbulanceBooking');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ─── Protected Routes ───

// Request ambulance (patient or admin)
router.post('/request', authenticate, authorize('patient', 'admin'), async (req, res) => {
  try {
    const { phone, pickupAddress, destinationHospital, emergencyType } = req.body;

    const booking = new AmbulanceBooking({
      userId: req.user.id,
      userName: req.user.name,
      phone, pickupAddress, destinationHospital,
      emergencyType: emergencyType || 'moderate'
    });
    await booking.save();

    // Simulate auto-dispatch
    booking.status = 'dispatched';
    booking.ambulanceId = `AMB-${Math.floor(Math.random() * 1000)}`;
    booking.estimatedArrival = '15 mins';
    await booking.save();

    if (req.app.locals.publishEvent) {
      req.app.locals.publishEvent('ambulance.requested', {
        bookingId: booking._id,
        userId: req.user.id,
        userName: req.user.name,
        ambulanceId: booking.ambulanceId,
        status: booking.status
      });
    }

    res.status(201).json({ message: 'Ambulance dispatched', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get booking status
router.get('/status/:id', authenticate, async (req, res) => {
  try {
    const booking = await AmbulanceBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Patients can only see their own
    if (req.user.role === 'patient' && booking.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my bookings (role-aware)
router.get('/my', authenticate, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'patient') {
      filter.userId = req.user.id;
    }
    const bookings = await AmbulanceBooking.find(filter).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bookings by user (backward compat)
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'patient' && req.user.id !== req.params.userId) {
      return res.status(403).json({ error: 'Patients can only view their own bookings' });
    }
    const bookings = await AmbulanceBooking.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
