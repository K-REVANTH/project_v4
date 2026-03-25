import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Doctors from './pages/Doctors'
import Pharmacy from './pages/Pharmacy'
import Records from './pages/Records'
import Labs from './pages/Labs'
import Ambulance from './pages/Ambulance'
import Login from './pages/Login'

function App() {
  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1>🏥 HealthCare</h1>
            <p>Microservices Platform</p>
          </div>
          <nav className="sidebar-nav">
            <NavLink to="/" end><span className="nav-icon">📊</span> Dashboard</NavLink>
            <NavLink to="/doctors"><span className="nav-icon">👨‍⚕️</span> Doctors</NavLink>
            <NavLink to="/pharmacy"><span className="nav-icon">💊</span> Pharmacy</NavLink>
            <NavLink to="/records"><span className="nav-icon">📋</span> Records</NavLink>
            <NavLink to="/labs"><span className="nav-icon">🔬</span> Lab Tests</NavLink>
            <NavLink to="/ambulance"><span className="nav-icon">🚑</span> Ambulance</NavLink>
            <NavLink to="/login"><span className="nav-icon">🔐</span> Login</NavLink>
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/pharmacy" element={<Pharmacy />} />
            <Route path="/records" element={<Records />} />
            <Route path="/labs" element={<Labs />} />
            <Route path="/ambulance" element={<Ambulance />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
