import { useState } from 'react'
import { api } from '../api'

function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState(null)
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    const action = isLogin ? api.login : api.register
    const payload = isLogin ? { email: form.email, password: form.password } : form

    action(payload)
      .then(data => {
        setMessage({ type: 'success', text: data.message })
        setUser(data.user)
        if (data.token) localStorage.setItem('token', data.token)
      })
      .catch(err => setMessage({ type: 'error', text: err.message }))
  }

  return (
    <div>
      <div className="page-header">
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        <p>Access your healthcare account</p>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="grid grid-2">
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </h3>
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </>
            )}
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="form-group"><label>Password</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              {isLogin ? '🔐 Login' : '📝 Register'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-light)', fontSize: '0.9rem' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); setMessage(null) }} style={{ color: 'var(--primary)' }}>
              {isLogin ? 'Register' : 'Login'}
            </a>
          </p>
        </div>

        {user && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Welcome!</h3>
            <div style={{ padding: 20, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> <span className="badge badge-info">{user.role}</span></p>
              <p><strong>ID:</strong> <code style={{ fontSize: '0.8rem' }}>{user.id}</code></p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Login
