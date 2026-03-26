// ─────────────────────────────────────────────────────────
// Centralized API Configuration
// ─────────────────────────────────────────────────────────
// Each microservice base URL. Uses env vars if set,
// otherwise defaults to localhost with the correct port.
//
// In K8s: override via VITE_*_API env vars (e.g., empty string
// to use Gateway routing from the same origin).
// ─────────────────────────────────────────────────────────

export const API = {
  USER:      import.meta.env.VITE_USER_API      || 'http://localhost:3001',
  DOCTOR:    import.meta.env.VITE_DOCTOR_API    || 'http://localhost:3002',
  LAB:       import.meta.env.VITE_LAB_API       || 'http://localhost:3003',
  AMBULANCE: import.meta.env.VITE_AMBULANCE_API || 'http://localhost:3004',
  PHARMACY:  import.meta.env.VITE_PHARMACY_API  || 'http://localhost:5001',
  RECORDS:   import.meta.env.VITE_RECORDS_API   || 'http://localhost:5002'
};
