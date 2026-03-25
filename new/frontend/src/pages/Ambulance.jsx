import { useState } from 'react'
import { api } from '../api'

function Ambulance() {
  const [message, setMessage] = useState(null)
  const [booking, setBooking] = useState(null)
  const [form, setForm] = useState({
    userId: '', userName: '', phone: '', pickupAddress: '',
    destinationHospital: '', emergencyType: 'moderate'
  })

  const handleRequest = (e) => {
    e.preventDefault()
    api.requestAmbulance(form)
      .then(data => {
        setMessage({ type: 'success', text: 'Ambulance dispatched!' })
        setBooking(data.booking)
      })
      .catch(err => setMessage({ type: 'error', text: err.message }))
  }

  return (
    <div>
      <div className="page-header">
        <h2>Ambulance Service</h2>
        <p>Request emergency ambulance booking</p>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="grid grid-2">
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Request Ambulance</h3>
          <form onSubmit={handleRequest}>
            <div className="form-group"><label>Your Name</label><input value={form.userName} onChange={e => setForm({ ...form, userName: e.target.value })} required /></div>
            <div className="form-group"><label>User ID</label><input value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} required /></div>
            <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required /></div>
            <div className="form-group"><label>Pickup Address</label><textarea value={form.pickupAddress} onChange={e => setForm({ ...form, pickupAddress: e.target.value })} rows={2} required /></div>
            <div className="form-group"><label>Destination Hospital</label><input value={form.destinationHospital} onChange={e => setForm({ ...form, destinationHospital: e.target.value })} required /></div>
            <div className="form-group"><label>Emergency Type</label>
              <select value={form.emergencyType} onChange={e => setForm({ ...form, emergencyType: e.target.value })}>
                <option value="critical">🔴 Critical</option>
                <option value="moderate">🟡 Moderate</option>
                <option value="non-emergency">🟢 Non-Emergency</option>
              </select>
            </div>
            <button type="submit" className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}>🚑 Request Ambulance</button>
          </form>
        </div>

        {booking && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Booking Confirmation</h3>
            <div style={{ padding: 20, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>✅ Ambulance Confirmed</p>
              <table style={{ width: '100%' }}>
                <tbody>
                  <tr><td style={{ fontWeight: 500, padding: '6px 0' }}>Ambulance ID:</td><td>{booking.ambulanceId}</td></tr>
                  <tr><td style={{ fontWeight: 500, padding: '6px 0' }}>Status:</td><td><span className="badge badge-success">{booking.status}</span></td></tr>
                  <tr><td style={{ fontWeight: 500, padding: '6px 0' }}>ETA:</td><td>{booking.estimatedArrival}</td></tr>
                  <tr><td style={{ fontWeight: 500, padding: '6px 0' }}>Destination:</td><td>{booking.destinationHospital}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Ambulance
