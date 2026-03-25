module.exports = {
  PORT: process.env.PORT || 3005,
  DOCTOR_SERVICE_URL: process.env.DOCTOR_SERVICE_URL || 'http://localhost:3002',
  PHARMACY_SERVICE_URL: process.env.PHARMACY_SERVICE_URL || 'http://localhost:5001',
  LAB_SERVICE_URL: process.env.LAB_SERVICE_URL || 'http://localhost:3003'
};
