import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">SR</span>
          <span className="brand-text">Store Rating</span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/stores" className={linkClass}>
            Stores
          </NavLink>

          {user && user.role === 'USER' && (
            <NavLink to="/my-ratings" className={linkClass}>
              My Ratings
            </NavLink>
          )}

          {user && user.role === 'OWNER' && (
            <>
              <NavLink to="/owner" className={linkClass}>
                Owner Dashboard
              </NavLink>
              <NavLink to="/stores" className={linkClass}>
                Browse
              </NavLink>
            </>
          )}

          {user && user.role === 'ADMIN' && (
            <>
              <NavLink to="/admin" className={linkClass}>
                Admin Dashboard
              </NavLink>
              <NavLink to="/stores" className={linkClass}>
                Stores
              </NavLink>
            </>
          )}
        </nav>

        <div className="nav-user">
          {user ? (
            <>
              <span className={`role-badge role-${user.role.toLowerCase()}`}>{user.role}</span>
              <span className="nav-name">{user.name}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Login
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}