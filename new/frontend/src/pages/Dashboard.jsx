import { useState, useEffect } from 'react'
import { api } from '../api'

function Dashboard() {
  const [data, setData] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([api.getDashboard(), api.getServiceHealth()])
      .then(([dashRes, healthRes]) => {
        if (dashRes.status === 'fulfilled') setData(dashRes.value)
        if (healthRes.status === 'fulfilled') setHealth(healthRes.value)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner"></div><p>Loading dashboard...</p></div>

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of all healthcare services</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon">👨‍⚕️</div>
          <div className="stat-value">{data?.data?.doctors?.length || 0}</div>
          <div className="stat-label">Doctors Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💊</div>
          <div className="stat-value">{data?.data?.medicines?.length || 0}</div>
          <div className="stat-label">Medicines Listed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔬</div>
          <div className="stat-value">{data?.data?.labTests?.length || 0}</div>
          <div className="stat-label">Lab Tests Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏥</div>
          <div className="stat-value">{data?.data?.errors?.length === 0 ? '✅' : '⚠️'}</div>
          <div className="stat-label">System Status</div>
        </div>
      </div>

      {health && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Service Health</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Service</th><th>Status</th><th>URL</th></tr>
              </thead>
              <tbody>
                {health.services?.map((s, i) => (
                  <tr key={i}>
                    <td>{s.name}</td>
                    <td><span className={`badge badge-${s.status === 'healthy' ? 'success' : 'danger'}`}>{s.status}</span></td>
                    <td style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{s.url}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.data?.errors?.length > 0 && (
        <div className="alert alert-error">
          ⚠️ Some services returned errors: {data.data.errors.map(e => e.service).join(', ')}
        </div>
      )}
    </div>
  )
}

export default Dashboard
