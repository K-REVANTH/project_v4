const express = require('express');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Public Routes ───

// List all doctors (public — no auth required)
router.get('/', async (req, res) => {
  try {
    const { hospitalId, specialization } = req.query;
    const filter = {};
    if (hospitalId) filter.hospitalId = hospitalId;
    if (specialization) filter.specialization = specialization;
    const doctors = await Doctor.find(filter);
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get doctors by hospital (public)
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const doctors = await Doctor.find({ hospitalId: req.params.hospitalId });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single doctor (public)
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Protected Routes ───

// Add doctor (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    await doctor.save();
    res.status(201).json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Book appointment (patient or admin)
router.post('/book', authenticate, authorize('patient', 'admin'), async (req, res) => {
  try {
    const { doctorId, patientId, patientName, date, timeSlot, notes } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    if (!doctor.isAvailable) return res.status(400).json({ error: 'Doctor not available' });

    // Patients can only book for themselves
    const actualPatientId = req.user.role === 'patient' ? req.user.id : patientId;
    const actualPatientName = req.user.role === 'patient' ? req.user.name : patientName;

    const appointment = new Appointment({
      doctorId,
      patientId: actualPatientId,
      patientName: actualPatientName,
      date, timeSlot, notes
    });
    await appointment.save();

    // Publish RabbitMQ event
    if (req.app.locals.publishEvent) {
      req.app.locals.publishEvent('appointment.booked', {
        appointmentId: appointment._id,
        doctorId,
        patientId: actualPatientId,
        patientName: actualPatientName,
        doctorName: doctor.name,
        date,
        timeSlot
      });
    }

    res.status(201).json({ message: 'Appointment booked', appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get appointments — role-aware
// Patient: own appointments only
// Doctor: appointments assigned to them
// Admin: all appointments
router.get('/appointments/list', authenticate, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'patient') {
      filter.patientId = req.user.id;
    } else if (req.user.role === 'doctor') {
      // Find doctor record by user's linked doctor profile
      const doctor = await Doctor.findOne({ userId: req.user.id });
      if (doctor) filter.doctorId = doctor._id;
    }
    // Admin: no filter — sees all

    const appointments = await Appointment.find(filter)
      .populate('doctorId', 'name specialization hospitalName')
      .sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get appointments by patient (backward compat — protected)
router.get('/appointments/:patientId', authenticate, async (req, res) => {
  try {
    // Patients can only see their own
    if (req.user.role === 'patient' && req.user.id !== req.params.patientId) {
      return res.status(403).json({ error: 'Patients can only view their own appointments' });
    }

    const appointments = await Appointment.find({ patientId: req.params.patientId })
      .populate('doctorId', 'name specialization hospitalName');
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel appointment (patient own, or admin)
router.patch('/appointments/:appointmentId/cancel', authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // Patient can only cancel own
    if (req.user.role === 'patient' && appointment.patientId !== req.user.id) {
      return res.status(403).json({ error: 'Can only cancel your own appointments' });
    }

    appointment.status = 'cancelled';
    await appointment.save();
    res.json({ message: 'Appointment cancelled', appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
