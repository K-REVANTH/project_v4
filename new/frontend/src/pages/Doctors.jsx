import { useState, useEffect } from 'react'
import { api } from '../api'

function Doctors() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({
    name: '', specialization: '', hospitalId: '', hospitalName: '',
    consultationFee: '', availableSlots: []
  })
  const [bookForm, setBookForm] = useState({
    doctorId: '', patientId: '', patientName: '', date: '', timeSlot: ''
  })

  useEffect(() => { loadDoctors() }, [])

  const loadDoctors = () => {
    setLoading(true)
    api.getDoctors()
      .then(setDoctors)
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false))
  }

  const handleAddDoctor = (e) => {
    e.preventDefault()
    api.addDoctor({ ...form, consultationFee: Number(form.consultationFee) })
      .then(() => { setMessage({ type: 'success', text: 'Doctor added!' }); loadDoctors(); setShowForm(false) })
      .catch(err => setMessage({ type: 'error', text: err.message }))
  }

  const handleBook = (e) => {
    e.preventDefault()
    api.bookAppointment(bookForm)
      .then(() => setMessage({ type: 'success', text: 'Appointment booked!' }))
      .catch(err => setMessage({ type: 'error', text: err.message }))
  }

  return (
    <div>
      <div className="page-header">
        <h2>Doctors & Appointments</h2>
        <p>Find doctors, check availability, and book appointments</p>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Doctor'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Add New Doctor</h3>
          <form onSubmit={handleAddDoctor}>
            <div className="grid grid-2">
              <div className="form-group">
                <label>Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Specialization</label>
                <input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Hospital ID</label>
                <input value={form.hospitalId} onChange={e => setForm({ ...form, hospitalId: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Hospital Name</label>
                <input value={form.hospitalName} onChange={e => setForm({ ...form, hospitalName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Consultation Fee (₹)</label>
                <input type="number" value={form.consultationFee} onChange={e => setForm({ ...form, consultationFee: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Save Doctor</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="card-title">Available Doctors</h3></div>
        {loading ? <div className="loading"><div className="spinner"></div></div> : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Name</th><th>Specialization</th><th>Hospital</th><th>Fee</th><th>Status</th></tr>
              </thead>
              <tbody>
                {doctors.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)' }}>No doctors found. Add one above.</td></tr>
                ) : doctors.map(d => (
                  <tr key={d._id}>
                    <td><strong>{d.name}</strong></td>
                    <td>{d.specialization}</td>
                    <td>{d.hospitalName}</td>
                    <td>₹{d.consultationFee}</td>
                    <td><span className={`badge badge-${d.isAvailable ? 'success' : 'danger'}`}>{d.isAvailable ? 'Available' : 'Unavailable'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>Book Appointment</h3>
        <form onSubmit={handleBook}>
          <div className="grid grid-2">
            <div className="form-group">
              <label>Doctor</label>
              <select value={bookForm.doctorId} onChange={e => setBookForm({ ...bookForm, doctorId: e.target.value })} required>
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d._id} value={d._id}>{d.name} - {d.specialization}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Patient Name</label>
              <input value={bookForm.patientName} onChange={e => setBookForm({ ...bookForm, patientName: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Patient ID</label>
              <input value={bookForm.patientId} onChange={e => setBookForm({ ...bookForm, patientId: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={bookForm.date} onChange={e => setBookForm({ ...bookForm, date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Time Slot</label>
              <input value={bookForm.timeSlot} onChange={e => setBookForm({ ...bookForm, timeSlot: e.target.value })} placeholder="e.g. 10:00 AM" required />
            </div>
          </div>
          <button type="submit" className="btn btn-secondary">Book Appointment</button>
        </form>
      </div>
    </div>
  )
}

export default Doctors
