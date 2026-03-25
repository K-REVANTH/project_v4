const express = require('express');
const cors = require('cors');
const axios = require('axios');
const config = require('./config');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'aggregator', timestamp: new Date().toISOString() });
});

// Dashboard — combines data from multiple services
app.get('/api/aggregator/dashboard', async (req, res) => {
  const results = { doctors: null, medicines: null, labTests: null, errors: [] };

  // Fetch from all services in parallel
  const [doctorsRes, pharmacyRes, labsRes] = await Promise.allSettled([
    axios.get(`${config.DOCTOR_SERVICE_URL}/api/doctors`),
    axios.get(`${config.PHARMACY_SERVICE_URL}/api/pharmacy/medicines`),
    axios.get(`${config.LAB_SERVICE_URL}/api/labs`)
  ]);

  if (doctorsRes.status === 'fulfilled') {
    results.doctors = doctorsRes.value.data;
  } else {
    results.errors.push({ service: 'doctors', error: doctorsRes.reason.message });
  }

  if (pharmacyRes.status === 'fulfilled') {
    results.medicines = pharmacyRes.value.data;
  } else {
    results.errors.push({ service: 'pharmacy', error: pharmacyRes.reason.message });
  }

  if (labsRes.status === 'fulfilled') {
    results.labTests = labsRes.value.data;
  } else {
    results.errors.push({ service: 'labs', error: labsRes.reason.message });
  }

  res.json({
    message: 'Dashboard data',
    timestamp: new Date().toISOString(),
    data: results
  });
});

// Service health check — checks all downstream services
app.get('/api/aggregator/health-check', async (req, res) => {
  const services = [
    { name: 'doctor-appointment', url: `${config.DOCTOR_SERVICE_URL}/health` },
    { name: 'pharmacy', url: `${config.PHARMACY_SERVICE_URL}/health` },
    { name: 'lab-appointment', url: `${config.LAB_SERVICE_URL}/health` }
  ];

  const checks = await Promise.allSettled(
    services.map(s => axios.get(s.url).then(() => ({ ...s, status: 'healthy' })))
  );

  const results = checks.map((c, i) => {
    if (c.status === 'fulfilled') return c.value;
    return { ...services[i], status: 'unhealthy', error: c.reason.message };
  });

  res.json({ services: results });
});

app.listen(config.PORT, () => {
  console.log(`Aggregator Service running on port ${config.PORT}`);
});

module.exports = app;
