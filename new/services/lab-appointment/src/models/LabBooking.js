const mongoose = require('mongoose');

const labBookingSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabTest', required: true },
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  scheduledDate: { type: String, required: true },
  status: { type: String, enum: ['booked', 'sample_collected', 'in_progress', 'completed'], default: 'booked' },
  results: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('LabBooking', labBookingSchema);
