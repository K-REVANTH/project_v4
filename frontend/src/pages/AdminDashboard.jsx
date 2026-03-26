import { useState, useEffect } from 'react'
import { api } from '../api'

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [doctors, setDoctors] = useState([])
  const [medicines, setMedicines] = useState([])
  const [labTests, setLabTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    Promise.allSettled([
      api.getAllUsers(),
      api.getDoctors(),
      api.getMedicines(),
      api.getLabTests()
    ]).then(([usersRes, docsRes, medsRes, labsRes]) => {
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value)
      if (docsRes.status === 'fulfilled') setDoctors(docsRes.value)
      if (medsRes.status === 'fulfilled') setMedicines(medsRes.value)
      if (labsRes.status === 'fulfilled') setLabTests(labsRes.value)
    }).finally(() => setLoading(false))
  }, [])

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user permanently?')) return
    try {
      await api.deleteUser(id)
      setUsers(users.filter(u => u._id !== id))
      setMessage({ type: 'success', text: 'User deleted' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const handleRoleChange = async (id, newRole) => {
    try {
      await api.changeUserRole(id, newRole)
      setUsers(users.map(u => u._id === id ? { ...u, role: newRole } : u))
      setMessage({ type: 'success', text: 'Role updated' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  if (loading) return <div className="loading"><div className="spinner"></div><p>Loading admin panel...</p></div>

  const patientCount = users.filter(u => u.role === 'patient').length
  const doctorCount = users.filter(u => u.role === 'doctor').length
  const adminCount = users.filter(u => u.role === 'admin').length

  return (
    <div>
      <div className="page-header">
        <h2>Admin Dashboard ⚙️</h2>
        <p>Full system overview and user management</p>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Total Users ({patientCount}P / {doctorCount}D / {adminCount}A)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👨‍⚕️</div>
          <div className="stat-value">{doctors.length}</div>
          <div className="stat-label">Doctors Listed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💊</div>
          <div className="stat-value">{medicines.length}</div>
          <div className="stat-label">Medicines</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔬</div>
          <div className="stat-value">{labTests.length}</div>
          <div className="stat-label">Lab Tests</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">User Management</h3></div>
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} onChange={e => handleRoleChange(u._id, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                      <option value="patient">Patient</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
