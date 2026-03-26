import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function PatientDashboard() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [labBookings, setLabBookings] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      api.getMyAppointments(),
      api.getMyLabBookings(),
      api.getRecords(user._id || user.id)
    ]).then(([apptRes, labRes, recRes]) => {
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value)
      if (labRes.status === 'fulfilled') setLabBookings(labRes.value)
      if (recRes.status === 'fulfilled') setRecords(recRes.value)
    }).finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="loading"><div className="spinner"></div><p>Loading your dashboard...</p></div>

  return (
    <div>
      <div className="page-header">
        <h2>Welcome, {user.name} 👋</h2>
        <p>Patient Dashboard — Your health, at a glance</p>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{appointments.length}</div>
          <div className="stat-label">Appointments</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔬</div>
          <div className="stat-value">{labBookings.length}</div>
          <div className="stat-label">Lab Bookings</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{records.length}</div>
          <div className="stat-label">Medical Records</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Recent Appointments</h3></div>
        {appointments.length === 0 ? (
          <p style={{ color: 'var(--text-light)' }}>No appointments yet. Book one from the Doctors page.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
              <tbody>
                {appointments.slice(0, 5).map(a => (
                  <tr key={a._id}>
                    <td>{a.doctorId?.name || 'N/A'}</td>
                    <td>{a.date}</td>
                    <td>{a.timeSlot}</td>
                    <td><span className={`badge badge-${a.status === 'booked' ? 'info' : a.status === 'completed' ? 'success' : 'danger'}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Recent Lab Bookings</h3></div>
        {labBookings.length === 0 ? (
          <p style={{ color: 'var(--text-light)' }}>No lab bookings yet.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Test</th><th>Lab</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {labBookings.slice(0, 5).map(b => (
                  <tr key={b._id}>
                    <td>{b.testId?.name || 'N/A'}</td>
                    <td>{b.testId?.labName || 'N/A'}</td>
                    <td>{b.scheduledDate}</td>
                    <td><span className={`badge badge-${b.status === 'completed' ? 'success' : 'info'}`}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
