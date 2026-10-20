import { useCallback, useEffect, useState } from 'react';
import { storeApi } from '../api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import { Link } from 'react-router-dom';

export default function MyRatingsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // The stores list already includes the signed-in user's own rating.
      const data = await storeApi.list({ limit: 100 });
      const rated = data.stores
        .filter((s) => s.user_rating)
        .map((s) => ({ store: s, rating: s.user_rating }));
      setRows(rated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <div className="page-head">
        <h1>My ratings</h1>
        <p className="page-sub">Every store you have reviewed.</p>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />

      {loading ? (
        <Spinner label="Loading your ratings…" />
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <h3>No ratings yet</h3>
          <p>Browse the stores and share your opinion.</p>
          <Link to="/stores" className="btn btn-primary">
            Browse stores
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Address</th>
                <th>Your rating</th>
                <th>Store average</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.store.id}>
                  <td>
                    <Link to={`/stores/${row.store.id}`}>{row.store.name}</Link>
                  </td>
                  <td>{row.store.address}</td>
                  <td>
                    <StarRating value={row.rating} readOnly size="sm" />
                  </td>
                  <td>{row.store.avg_rating.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}