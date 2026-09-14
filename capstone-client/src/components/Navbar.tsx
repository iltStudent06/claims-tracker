import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="navbar-shell">
      <header className="navbar" aria-label="Main navigation">
        <div className="navbar-left">
          <Link to="/" className="navbar-brand">
            <span className="navbar-logo" aria-hidden="true">
              🛡️
            </span>
            <span>Policy Claims Tracker</span>
          </Link>

          <nav className="navbar-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `navbar-link${isActive ? ' is-active' : ''}`}
            >
              Dashboard
            </NavLink>
            <NavLink to="/claims" className={({ isActive }) => `navbar-link${isActive ? ' is-active' : ''}`}>
              Claims
            </NavLink>
            <NavLink
              to="/policies"
              className={({ isActive }) => `navbar-link${isActive ? ' is-active' : ''}`}
            >
              Policies
            </NavLink>
          </nav>
        </div>

        <div className="navbar-right">
          <span className="navbar-user">{user?.name ?? 'User'}</span>
          <span className="navbar-role">{user?.role ?? 'unknown'}</span>
          <button type="button" className="navbar-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
    </div>
  )
}

export default Navbar
