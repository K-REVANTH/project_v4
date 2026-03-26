import { useState, useEffect } from 'react'
import { api } from '../api'

function Labs() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', category: '', price: '', labName: '', turnaroundDays: '2' })
  const [bookForm, setBookForm] = useState({ testId: '', patientId: '', patientName: '', scheduledDate: '' })

  useEffect(() => { loadTests() }, [])

  const loadTests = () => {
    setLoading(true)
    api.getLabTests()
      .then(setTests)
      .catch(() => setTests([]))
      .finally(() => setLoading(false))
  }

  const handleAdd = (e) => {
    e.preventDefault()
    api.addLabTest({ ...addForm, price: Number(addForm.price), turnaroundDays: Number(addForm.turnaroundDays) })
      .then(() => { setMessage({ type: 'success', text: 'Test added!' }); loadTests(); setShowAddForm(false) })
      .catch(err => setMessage({ type: 'error', text: err.message }))
  }

  const handleBook = (e) => {
    e.preventDefault()
    api.bookLabTest(bookForm)
      .then(() => setMessage({ type: 'success', text: 'Lab test booked!' }))
      .catch(err => setMessage({ type: 'error', text: err.message }))
  }

  return (
    <div>
      <div className="page-header">
        <h2>Lab Tests</h2>
        <p>Browse and book laboratory tests</p>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : '+ Add Lab Test'}
        </button>
      </div>

      {showAddForm && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Add New Lab Test</h3>
          <form onSubmit={handleAdd}>
            <div className="grid grid-2">
              <div className="form-group"><label>Test Name</label><input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} required /></div>
              <div className="form-group"><label>Category</label><input value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })} required /></div>
              <div className="form-group"><label>Price (₹)</label><input type="number" value={addForm.price} onChange={e => setAddForm({ ...addForm, price: e.target.value })} required /></div>
              <div className="form-group"><label>Lab Name</label><input value={addForm.labName} onChange={e => setAddForm({ ...addForm, labName: e.target.value })} required /></div>
              <div className="form-group"><label>Turnaround (Days)</label><input type="number" value={addForm.turnaroundDays} onChange={e => setAddForm({ ...addForm, turnaroundDays: e.target.value })} /></div>
            </div>
            <button type="submit" className="btn btn-primary">Save Test</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="card-title">Available Tests</h3></div>
        {loading ? <div className="loading"><div className="spinner"></div></div> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Test Name</th><th>Category</th><th>Lab</th><th>Price</th><th>Turnaround</th></tr></thead>
              <tbody>
                {tests.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)' }}>No lab tests found.</td></tr>
                ) : tests.map(t => (
                  <tr key={t._id}>
                    <td><strong>{t.name}</strong></td>
                    <td>{t.category}</td>
                    <td>{t.labName}</td>
                    <td>₹{t.price}</td>
                    <td>{t.turnaroundDays} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>Book Lab Test</h3>
        <form onSubmit={handleBook}>
          <div className="grid grid-2">
            <div className="form-group"><label>Lab Test</label>
              <select value={bookForm.testId} onChange={e => setBookForm({ ...bookForm, testId: e.target.value })} required>
                <option value="">Select test</option>
                {tests.map(t => <option key={t._id} value={t._id}>{t.name} - ₹{t.price}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Patient Name</label><input value={bookForm.patientName} onChange={e => setBookForm({ ...bookForm, patientName: e.target.value })} required /></div>
            <div className="form-group"><label>Patient ID</label><input value={bookForm.patientId} onChange={e => setBookForm({ ...bookForm, patientId: e.target.value })} required /></div>
            <div className="form-group"><label>Scheduled Date</label><input type="date" value={bookForm.scheduledDate} onChange={e => setBookForm({ ...bookForm, scheduledDate: e.target.value })} required /></div>
          </div>
          <button type="submit" className="btn btn-secondary">Book Test</button>
        </form>
      </div>
    </div>
  )
}

export default Labs
