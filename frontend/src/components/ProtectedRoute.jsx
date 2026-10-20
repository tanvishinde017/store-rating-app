import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container page">
        <div className="loading">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length && !roles.includes(user.role)) {
    return (
      <div className="container page">
        <div className="alert alert-error">
          You do not have permission to view this page.
        </div>
        <a className="btn btn-primary" href="/">
          Go back home
        </a>
      </div>
    );
  }

  return children;
}