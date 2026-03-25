const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  hospitalId: { type: String, required: true },
  hospitalName: { type: String, required: true },
  availableSlots: [
    {
      day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
      startTime: String,
      endTime: String,
      maxPatients: { type: Number, default: 10 }
    }
  ],
  consultationFee: { type: Number, default: 500 },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
