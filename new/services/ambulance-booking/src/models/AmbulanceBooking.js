const mongoose = require('mongoose');

const ambulanceBookingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  phone: { type: String, required: true },
  pickupAddress: { type: String, required: true },
  destinationHospital: { type: String, required: true },
  emergencyType: { type: String, enum: ['critical', 'moderate', 'non-emergency'], default: 'moderate' },
  status: { type: String, enum: ['requested', 'dispatched', 'en_route', 'completed', 'cancelled'], default: 'requested' },
  ambulanceId: { type: String, default: null },
  estimatedArrival: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('AmbulanceBooking', ambulanceBookingSchema);
