import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Route guard component.
 * - If no roles specified: just requires authentication
 * - If roles specified: requires authentication + matching role
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, role, loading } = useAuth()

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(role)) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>🚫 Access Denied</h2>
        <p style={{ color: 'var(--text-light)', marginTop: 8 }}>
          Your role <strong>({role})</strong> does not have access to this page.
        </p>
        <p style={{ color: 'var(--text-light)', marginTop: 4 }}>
          Required: {roles.join(' or ')}
        </p>
      </div>
    )
  }

  return children
}
