import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ─────────────────────────────────────────────────────────
// Vite Dev Proxy — routes each /api/* path to the correct
// microservice port during local development (no gateway).
//
// In Docker Compose: services resolve by container name.
// In K8s: Gateway API handles routing, no proxy needed.
// This proxy is ONLY active during `npm run dev`.
// ─────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      // User Management → :3001
      '/api/users': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // Doctor Appointment → :3002
      '/api/doctors': {
        target: 'http://localhost:3002',
        changeOrigin: true
      },
      // Lab Appointment → :3003
      '/api/labs': {
        target: 'http://localhost:3003',
        changeOrigin: true
      },
      // Ambulance Booking → :3004
      '/api/ambulance': {
        target: 'http://localhost:3004',
        changeOrigin: true
      },
      // Pharmacy → :5001
      '/api/pharmacy': {
        target: 'http://localhost:5001',
        changeOrigin: true
      },
      // Medical Records → :5002
      '/api/records': {
        target: 'http://localhost:5002',
        changeOrigin: true
      }
    }
  }
})
