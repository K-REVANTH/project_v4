import { useState } from 'react'
import { api } from '../api'

function Records() {
  const [patientId, setPatientId] = useState('')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({
    patientId: '', patientName: '', type: 'consultation',
    description: '', doctorName: '', diagnosis: '', prescription: '', notes: ''
  })

  const handleSearch = (e) => {
    e.preventDefault()
    if (!patientId.trim()) return
    setLoading(true)
    api.getRecords(patientId)
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }

  const handleCreate = (e) => {
    e.preventDefault()
    api.createRecord(form)
      .then(() => { setMessage({ type: 'success', text: 'Record created!' }); setShowForm(false) })
      .catch(err => setMessage({ type: 'error', text: err.message }))
  }

  return (
    <div>
      <div className="page-header">
        <h2>Medical Records</h2>
        <p>View and manage patient medical history</p>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>Search Patient Records</h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
          <input value={patientId} onChange={e => setPatientId(e.target.value)} placeholder="Enter Patient ID" style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8 }} />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Create Record'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>New Medical Record</h3>
          <form onSubmit={handleCreate}>
            <div className="grid grid-2">
              <div className="form-group"><label>Patient ID</label><input value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} required /></div>
              <div className="form-group"><label>Patient Name</label><input value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })} required /></div>
              <div className="form-group"><label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="consultation">Consultation</option>
                  <option value="lab_test">Lab Test</option>
                  <option value="prescription">Prescription</option>
                  <option value="surgery">Surgery</option>
                </select>
              </div>
              <div className="form-group"><label>Doctor Name</label><input value={form.doctorName} onChange={e => setForm({ ...form, doctorName: e.target.value })} /></div>
              <div className="form-group"><label>Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
              <div className="form-group"><label>Diagnosis</label><input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Prescription</label><textarea value={form.prescription} onChange={e => setForm({ ...form, prescription: e.target.value })} rows={2} /></div>
            <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <button type="submit" className="btn btn-primary">Save Record</button>
          </form>
        </div>
      )}

      {loading ? <div className="loading"><div className="spinner"></div></div> : records.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Records ({records.length})</h3></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Doctor</th><th>Source</th></tr></thead>
              <tbody>
                {records.map(r => (
                  <tr key={r._id}>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
                    <td><span className="badge badge-info">{r.type}</span></td>
                    <td>{r.description}</td>
                    <td>{r.doctorName || '-'}</td>
                    <td><span className={`badge ${r.source === 'rabbitmq-auto' ? 'badge-warning' : 'badge-success'}`}>{r.source || 'manual'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Records
