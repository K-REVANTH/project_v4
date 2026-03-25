const express = require('express');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

const router = express.Router();

// List all doctors
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

// Get doctors by hospital
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const doctors = await Doctor.find({ hospitalId: req.params.hospitalId });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single doctor
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add doctor (admin)
router.post('/', async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    await doctor.save();
    res.status(201).json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Book appointment
router.post('/book', async (req, res) => {
  try {
    const { doctorId, patientId, patientName, date, timeSlot, notes } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    if (!doctor.isAvailable) return res.status(400).json({ error: 'Doctor not available' });

    const appointment = new Appointment({ doctorId, patientId, patientName, date, timeSlot, notes });
    await appointment.save();

    // Publish event (handled in index.js via req.app)
    if (req.app.locals.publishEvent) {
      req.app.locals.publishEvent('appointment.booked', {
        appointmentId: appointment._id,
        doctorId,
        patientId,
        patientName,
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

// Get appointments by patient
router.get('/appointments/:patientId', async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.params.patientId })
      .populate('doctorId', 'name specialization hospitalName');
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
