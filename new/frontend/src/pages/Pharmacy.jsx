import { useState, useEffect } from 'react'
import { api } from '../api'

function Pharmacy() {
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [form, setForm] = useState({
    name: '', category: '', price: '', stock: '', manufacturer: '',
    requiresPrescription: false, description: ''
  })

  useEffect(() => { loadMedicines() }, [])

  const loadMedicines = () => {
    setLoading(true)
    api.getMedicines()
      .then(setMedicines)
      .catch(() => setMedicines([]))
      .finally(() => setLoading(false))
  }

  const handleAdd = (e) => {
    e.preventDefault()
    api.addMedicine({ ...form, price: Number(form.price), stock: Number(form.stock) })
      .then(() => { setMessage({ type: 'success', text: 'Medicine added!' }); loadMedicines(); setShowForm(false) })
      .catch(err => setMessage({ type: 'error', text: err.message }))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) { loadMedicines(); return }
    api.searchMedicines(searchQuery)
      .then(setMedicines)
      .catch(err => setMessage({ type: 'error', text: err.message }))
  }

  return (
    <div>
      <div className="page-header">
        <h2>Pharmacy</h2>
        <p>Browse medicines, check stock, and manage inventory</p>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Medicine'}
        </button>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search medicines..." style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8 }} />
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        </form>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Add New Medicine</h3>
          <form onSubmit={handleAdd}>
            <div className="grid grid-2">
              <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="form-group"><label>Category</label><input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required /></div>
              <div className="form-group"><label>Price (₹)</label><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required /></div>
              <div className="form-group"><label>Stock</label><input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required /></div>
              <div className="form-group"><label>Manufacturer</label><input value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} required /></div>
              <div className="form-group"><label>Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <button type="submit" className="btn btn-primary">Save Medicine</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="card-title">Medicine Catalog</h3></div>
        {loading ? <div className="loading"><div className="spinner"></div></div> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Manufacturer</th><th>Rx</th></tr></thead>
              <tbody>
                {medicines.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)' }}>No medicines found.</td></tr>
                ) : medicines.map(m => (
                  <tr key={m._id}>
                    <td><strong>{m.name}</strong></td>
                    <td>{m.category}</td>
                    <td>₹{m.price}</td>
                    <td><span className={`badge badge-${m.stock > 10 ? 'success' : m.stock > 0 ? 'warning' : 'danger'}`}>{m.stock}</span></td>
                    <td>{m.manufacturer}</td>
                    <td>{m.requiresPrescription ? '✅' : '❌'}</td>
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

export default Pharmacy
