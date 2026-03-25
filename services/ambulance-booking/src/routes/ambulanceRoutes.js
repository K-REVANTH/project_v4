const express = require('express');
const AmbulanceBooking = require('../models/AmbulanceBooking');

const router = express.Router();

// Request ambulance
router.post('/request', async (req, res) => {
  try {
    const { userId, userName, phone, pickupAddress, destinationHospital, emergencyType } = req.body;

    const booking = new AmbulanceBooking({
      userId, userName, phone, pickupAddress, destinationHospital, emergencyType
    });
    await booking.save();

    // Simulate auto-dispatch
    booking.status = 'dispatched';
    booking.ambulanceId = `AMB-${Math.floor(Math.random() * 1000)}`;
    booking.estimatedArrival = '15 mins';
    await booking.save();

    // Publish event
    if (req.app.locals.publishEvent) {
      req.app.locals.publishEvent('ambulance.requested', {
        bookingId: booking._id,
        userId,
        userName,
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
router.get('/status/:id', async (req, res) => {
  try {
    const booking = await AmbulanceBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bookings by user
router.get('/user/:userId', async (req, res) => {
  try {
    const bookings = await AmbulanceBooking.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
