import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function DoctorDashboard() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getMyAppointments()
      .then(setAppointments)
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner"></div><p>Loading schedule...</p></div>

  const todayAppts = appointments.filter(a => a.status === 'booked')
  const completedAppts = appointments.filter(a => a.status === 'completed')

  return (
    <div>
      <div className="page-header">
        <h2>Dr. {user.name} 🩺</h2>
        <p>Doctor Dashboard — Manage your schedule & patients</p>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{todayAppts.length}</div>
          <div className="stat-label">Active Appointments</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{completedAppts.length}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{new Set(appointments.map(a => a.patientId)).size}</div>
          <div className="stat-label">Total Patients</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Upcoming Appointments</h3></div>
        {todayAppts.length === 0 ? (
          <p style={{ color: 'var(--text-light)' }}>No upcoming appointments.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Status</th><th>Notes</th></tr></thead>
              <tbody>
                {todayAppts.map(a => (
                  <tr key={a._id}>
                    <td><strong>{a.patientName}</strong></td>
                    <td>{a.date}</td>
                    <td>{a.timeSlot}</td>
                    <td><span className="badge badge-info">{a.status}</span></td>
                    <td style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{a.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">All Appointments</h3></div>
        <div className="table-container">
          <table>
            <thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)' }}>No appointments found.</td></tr>
              ) : appointments.map(a => (
                <tr key={a._id}>
                  <td>{a.patientName}</td>
                  <td>{a.date}</td>
                  <td>{a.timeSlot}</td>
                  <td><span className={`badge badge-${a.status === 'booked' ? 'info' : a.status === 'completed' ? 'success' : 'danger'}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
