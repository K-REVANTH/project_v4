const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  labName: { type: String, required: true },
  turnaroundDays: { type: Number, default: 2 },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('LabTest', labTestSchema);
