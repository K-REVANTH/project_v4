const API_BASE = import.meta.env.VITE_API_BASE || '';

async function request(url, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // User Management
  register: (data) => request('/api/users/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/users/login', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: (id) => request(`/api/users/profile/${id}`),

  // Doctors
  getDoctors: () => request('/api/doctors'),
  getDoctorsByHospital: (hospitalId) => request(`/api/doctors/hospital/${hospitalId}`),
  addDoctor: (data) => request('/api/doctors', { method: 'POST', body: JSON.stringify(data) }),
  bookAppointment: (data) => request('/api/doctors/book', { method: 'POST', body: JSON.stringify(data) }),

  // Pharmacy
  getMedicines: () => request('/api/pharmacy/medicines'),
  addMedicine: (data) => request('/api/pharmacy/medicines', { method: 'POST', body: JSON.stringify(data) }),
  searchMedicines: (q) => request(`/api/pharmacy/medicines/search?q=${q}`),

  // Medical Records
  getRecords: (patientId) => request(`/api/records/${patientId}`),
  createRecord: (data) => request('/api/records', { method: 'POST', body: JSON.stringify(data) }),

  // Lab Appointments
  getLabTests: () => request('/api/labs'),
  bookLabTest: (data) => request('/api/labs/book', { method: 'POST', body: JSON.stringify(data) }),

  // Ambulance
  requestAmbulance: (data) => request('/api/ambulance/request', { method: 'POST', body: JSON.stringify(data) }),
  getAmbulanceStatus: (id) => request(`/api/ambulance/status/${id}`),

  // Aggregator
  getDashboard: () => request('/api/aggregator/dashboard'),
  getServiceHealth: () => request('/api/aggregator/health-check')
};
