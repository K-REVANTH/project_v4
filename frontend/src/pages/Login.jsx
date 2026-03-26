import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    role: 'patient', specialization: '', hospitalName: '', licenseNumber: ''
  })

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate('/', { replace: true })
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      let data
      if (isLogin) {
        data = await api.login({ email: form.email, password: form.password })
      } else {
        const payload = { name: form.name, email: form.email, password: form.password, phone: form.phone, role: form.role }
        if (form.role === 'doctor') {
          payload.specialization = form.specialization
          payload.hospitalName = form.hospitalName
          payload.licenseNumber = form.licenseNumber
        }
        data = await api.register(payload)
      }

      login(data.user, data.token)
      setMessage({ type: 'success', text: `Welcome, ${data.user.name}!` })
      setTimeout(() => navigate('/'), 500)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>{isLogin ? '🔐 Sign In' : '📝 Create Account'}</h2>
        <p>Access the healthcare platform</p>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="grid grid-2">
        <div className="card">
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="form-group">
                  <label>Full Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Register As</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="patient">🧑 Patient</option>
                    <option value="doctor">👨‍⚕️ Doctor</option>
                    <option value="admin">⚙️ Admin</option>
                  </select>
                </div>
                {form.role === 'doctor' && (
                  <>
                    <div className="form-group">
                      <label>Specialization*</label>
                      <input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Hospital Name</label>
                      <input value={form.hospitalName} onChange={e => setForm({ ...form, hospitalName: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>License Number</label>
                      <input value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} />
                    </div>
                  </>
                )}
              </>
            )}
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? '🔐 Sign In' : '📝 Register'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-light)', fontSize: '0.9rem' }}>
            {isLogin ? "Don't have an account? " : 'Already registered? '}
            <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); setMessage(null) }}
              style={{ color: 'var(--primary)' }}>
              {isLogin ? 'Register' : 'Sign In'}
            </a>
          </p>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)' }}>
          <h3 className="card-title" style={{ marginBottom: 16 }}>🏥 Role Access Guide</h3>
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ color: 'var(--primary)', marginBottom: 6 }}>🧑 Patient</h4>
            <ul style={{ color: 'var(--text-light)', fontSize: '0.85rem', paddingLeft: 18 }}>
              <li>View & book doctor appointments</li>
              <li>Book lab tests & view results</li>
              <li>Request ambulance service</li>
              <li>Access personal medical records</li>
            </ul>
          </div>
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ color: 'var(--warning)', marginBottom: 6 }}>👨‍⚕️ Doctor</h4>
            <ul style={{ color: 'var(--text-light)', fontSize: '0.85rem', paddingLeft: 18 }}>
              <li>Manage appointment schedule</li>
              <li>View patient records</li>
              <li>Browse doctor directory</li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: 'var(--danger)', marginBottom: 6 }}>⚙️ Admin</h4>
            <ul style={{ color: 'var(--text-light)', fontSize: '0.85rem', paddingLeft: 18 }}>
              <li>Full system access</li>
              <li>Add doctors, medicines, lab tests</li>
              <li>Manage users and roles</li>
              <li>View all bookings system-wide</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
