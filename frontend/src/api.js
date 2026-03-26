import { API } from './config/api';

// ─────────────────────────────────────────────────────────
// API Client — all calls use absolute URLs pointing to the
// correct microservice. No relative paths, no proxy needed.
// ─────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('token');
}

/**
 * Core request function:
 * - Builds absolute URL: baseUrl + path
 * - Injects Bearer token from localStorage
 * - Sets Content-Type: application/json
 * - Handles non-JSON responses gracefully
 */
async function request(baseUrl, path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${baseUrl}${path}`;

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (networkErr) {
    throw new Error(`Network error: could not reach ${url}. Is the service running?`);
  }

  // Safe JSON parsing — prevents "Unexpected token '<'" crashes
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (text.startsWith('<!') || text.startsWith('<html')) {
      throw new Error(`Service unavailable at ${baseUrl}. Got HTML instead of JSON — check if the backend is running on the correct port.`);
    }
    try {
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    } catch {
      throw new Error(`Unexpected response from ${url}: ${text.substring(0, 120)}`);
    }
  }

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ─── Per-service request helpers ───
const userReq    = (path, opts) => request(API.USER, path, opts);
const doctorReq  = (path, opts) => request(API.DOCTOR, path, opts);
const labReq     = (path, opts) => request(API.LAB, path, opts);
const ambReq     = (path, opts) => request(API.AMBULANCE, path, opts);
const pharmaReq  = (path, opts) => request(API.PHARMACY, path, opts);
const recordsReq = (path, opts) => request(API.RECORDS, path, opts);

export const api = {
  // ─── Auth (user-management → http://localhost:3001) ───
  register:        (data) => userReq('/api/users/register', { method: 'POST', body: JSON.stringify(data) }),
  login:           (data) => userReq('/api/users/login', { method: 'POST', body: JSON.stringify(data) }),
  getMyProfile:    ()     => userReq('/api/users/me'),
  updateMyProfile: (data) => userReq('/api/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  getProfile:      (id)   => userReq(`/api/users/profile/${id}`),
  getNotifications:()     => userReq('/api/users/notifications'),

  // Admin-only (user-management → http://localhost:3001)
  getAllUsers:     (role)      => userReq(`/api/users/all${role ? `?role=${role}` : ''}`),
  deleteUser:     (id)        => userReq(`/api/users/${id}`, { method: 'DELETE' }),
  changeUserRole: (id, role)  => userReq(`/api/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),

  // ─── Doctors (doctor-appointment → http://localhost:3002) ───
  getDoctors:            ()     => doctorReq('/api/doctors'),
  getDoctorsByHospital:  (hId)  => doctorReq(`/api/doctors/hospital/${hId}`),
  addDoctor:             (data) => doctorReq('/api/doctors', { method: 'POST', body: JSON.stringify(data) }),
  bookAppointment:       (data) => doctorReq('/api/doctors/book', { method: 'POST', body: JSON.stringify(data) }),
  getMyAppointments:     ()     => doctorReq('/api/doctors/appointments/list'),
  getAppointmentsByPatient: (pId) => doctorReq(`/api/doctors/appointments/${pId}`),
  cancelAppointment:     (id)   => doctorReq(`/api/doctors/appointments/${id}/cancel`, { method: 'PATCH' }),

  // ─── Pharmacy (→ http://localhost:5001) ───
  getMedicines:    ()     => pharmaReq('/api/pharmacy/medicines'),
  addMedicine:     (data) => pharmaReq('/api/pharmacy/medicines', { method: 'POST', body: JSON.stringify(data) }),
  searchMedicines: (q)    => pharmaReq(`/api/pharmacy/medicines/search?q=${q}`),

  // ─── Medical Records (→ http://localhost:5002) ───
  getRecords:   (patientId) => recordsReq(`/api/records/${patientId}`),
  createRecord: (data)      => recordsReq('/api/records', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Lab Appointments (→ http://localhost:3003) ───
  getLabTests:      ()     => labReq('/api/labs'),
  addLabTest:       (data) => labReq('/api/labs', { method: 'POST', body: JSON.stringify(data) }),
  bookLabTest:      (data) => labReq('/api/labs/book', { method: 'POST', body: JSON.stringify(data) }),
  getMyLabBookings: ()     => labReq('/api/labs/bookings/list'),

  // ─── Ambulance (→ http://localhost:3004) ───
  requestAmbulance:       (data) => ambReq('/api/ambulance/request', { method: 'POST', body: JSON.stringify(data) }),
  getAmbulanceStatus:     (id)   => ambReq(`/api/ambulance/status/${id}`),
  getMyAmbulanceBookings: ()     => ambReq('/api/ambulance/my')
};
