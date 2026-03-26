import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import PatientDashboard from './pages/PatientDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import Doctors from './pages/Doctors'
import Pharmacy from './pages/Pharmacy'
import Records from './pages/Records'
import Labs from './pages/Labs'
import Ambulance from './pages/Ambulance'
import Login from './pages/Login'

function DashboardRouter() {
  const { role } = useAuth()
  switch (role) {
    case 'doctor': return <DoctorDashboard />
    case 'admin': return <AdminDashboard />
    default: return <PatientDashboard />
  }
}

function AppContent() {
  const { isAuthenticated, user, logout, role } = useAuth()

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>🏥 HealthCare</h1>
          <p>Microservices Platform</p>
        </div>
        {isAuthenticated && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>
            <span style={{ color: '#94a3b8' }}>Logged in as</span>
            <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{user?.name}</div>
            <span className={`badge badge-${role === 'admin' ? 'danger' : role === 'doctor' ? 'warning' : 'info'}`}
              style={{ marginTop: 4, display: 'inline-block' }}>{role?.toUpperCase()}</span>
          </div>
        )}
        <nav className="sidebar-nav">
          {isAuthenticated ? (
            <>
              <NavLink to="/" end><span className="nav-icon">📊</span> Dashboard</NavLink>
              <NavLink to="/doctors"><span className="nav-icon">👨‍⚕️</span> Doctors</NavLink>
              <NavLink to="/pharmacy"><span className="nav-icon">💊</span> Pharmacy</NavLink>

              {(role === 'patient' || role === 'admin') && (
                <>
                  <NavLink to="/records"><span className="nav-icon">📋</span> Records</NavLink>
                  <NavLink to="/labs"><span className="nav-icon">🔬</span> Lab Tests</NavLink>
                  <NavLink to="/ambulance"><span className="nav-icon">🚑</span> Ambulance</NavLink>
                </>
              )}

              {role === 'doctor' && (
                <NavLink to="/records"><span className="nav-icon">📋</span> Patient Records</NavLink>
              )}

              <a href="#" onClick={(e) => { e.preventDefault(); logout() }}
                style={{ color: '#ef4444', marginTop: 'auto' }}>
                <span className="nav-icon">🚪</span> Logout
              </a>
            </>
          ) : (
            <NavLink to="/login"><span className="nav-icon">🔐</span> Login</NavLink>
          )}
        </nav>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute><DashboardRouter /></ProtectedRoute>
          } />
          <Route path="/doctors" element={
            <ProtectedRoute><Doctors /></ProtectedRoute>
          } />
          <Route path="/pharmacy" element={
            <ProtectedRoute><Pharmacy /></ProtectedRoute>
          } />
          <Route path="/records" element={
            <ProtectedRoute roles={['patient', 'doctor', 'admin']}><Records /></ProtectedRoute>
          } />
          <Route path="/labs" element={
            <ProtectedRoute roles={['patient', 'admin']}><Labs /></ProtectedRoute>
          } />
          <Route path="/ambulance" element={
            <ProtectedRoute roles={['patient', 'admin']}><Ambulance /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App
