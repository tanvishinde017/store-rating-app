import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storeApi } from '../api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';

export default function StoreDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [store, setStore] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [myRating, setMyRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await storeApi.get(id);
      setStore(data.store);
      if (user) {
        const ratingData = await storeApi.ratings(id);
        setRatings(ratingData.ratings);
        const mine = ratingData.ratings.find((r) => r.user_id === user.id);
        setMyRating(mine ? mine.rating : 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRate = async (value) => {
    setError('');
    try {
      const data = await storeApi.rate(id, value);
      setMyRating(value);
      setMessage(
        data.message || 'Your rating has been saved. Thank you for reviewing this store.'
      );
      const ratingData = await storeApi.ratings(id);
      setRatings(ratingData.ratings);
      setStore((prev) =>
        prev ? { ...prev, avg_rating: data.avg_rating, rating_count: data.rating_count } : prev
      );
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Spinner label="Loading store…" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="page">
        <ErrorBanner message={error || 'Store not found'} />
        <Link to="/stores" className="btn btn-primary">
          Back to stores
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/stores" className="back-link">
        ← Back to stores
      </Link>

      <div className="detail-head">
        <div>
          <h1 className="detail-title">{store.name}</h1>
          <p className="detail-address">{store.address}</p>
          <p className="detail-email">{store.email}</p>
          {store.owner_name && <p className="detail-owner">Owned by {store.owner_name}</p>}
        </div>

        <div className="detail-score">
          <span className="detail-score-value">{store.avg_rating.toFixed(1)}</span>
          <StarRating value={store.avg_rating} readOnly />
          <span className="detail-score-count">
            {store.rating_count || 0} rating{store.rating_count === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {user && (
        <div className="rate-panel">
          <h2>Your rating</h2>
          {myRating ? (
            <p className="rate-panel-note">You rated this store {myRating} star(s).</p>
          ) : (
            <p className="rate-panel-note">You have not rated this store yet.</p>
          )}
          <StarRating value={myRating} onChange={handleRate} />
        </div>
      )}

      {!user && (
        <div className="rate-panel">
          <p className="rate-panel-note">
            <Link to="/login">Log in</Link> to rate this store.
          </p>
        </div>
      )}

      {message && (
        <div className="alert alert-success">
          <span>{message}</span>
          <button type="button" className="alert-close" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}

      <ErrorBanner message={error} onClose={() => setError('')} />

      <h2 className="section-title">What people said</h2>
      {ratings.length === 0 ? (
        <div className="empty-state">
          <p>No ratings yet. Be the first to review this store.</p>
        </div>
      ) : (
        <ul className="rating-list">
          {ratings.map((r) => (
            <li className="rating-item" key={r.id}>
              <div className="rating-item-head">
                <span className="rating-item-name">{r.name}</span>
                <StarRating value={r.rating} readOnly size="sm" />
              </div>
              <span className="rating-item-date">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}