import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ownerApi, storeApi } from '../api';
import StarRating from '../components/StarRating';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import Modal from '../components/Modal';

export default function OwnerDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', address: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [ratingsFor, setRatingsFor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ownerApi.dashboard();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await storeApi.create({ ...form });
      setShowCreate(false);
      setForm({ name: '', email: '', address: '' });
      setMessage('Store created successfully.');
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const viewRatings = async (store) => {
    setError('');
    try {
      const result = await ownerApi.storeRatings(store.id);
      setRatingsFor({ store, ...result });
    } catch (err) {
      setError(err.message);
    }
  };

  const removeStore = async (store) => {
    if (!window.confirm(`Delete "${store.name}"? This also removes its ratings.`)) {
      return;
    }
    setError('');
    try {
      await storeApi.remove(store.id);
      setMessage('Store deleted.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Spinner label="Loading your dashboard…" />
      </div>
    );
  }

  const stores = (data && data.stores) || [];

  return (
    <div className="page">
      <div className="page-head page-head-row">
        <div>
          <h1>Owner dashboard</h1>
          <p className="page-sub">Your stores and how customers rated them.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          Add store
        </button>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      {message && (
        <div className="alert alert-success">
          <span>{message}</span>
          <button type="button" className="alert-close" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">{data ? data.store_count : 0}</span>
          <span className="stat-label">Stores</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{data ? data.total_ratings : 0}</span>
          <span className="stat-label">Total ratings</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{data ? data.avg_rating.toFixed(1) : '0.0'}</span>
          <span className="stat-label">Average rating</span>
        </div>
      </div>

      <h2 className="section-title">Your stores</h2>
      {stores.length === 0 ? (
        <div className="empty-state">
          <h3>No stores yet</h3>
          <p>Add your first store so customers can review it.</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            Add store
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Address</th>
                <th>Rating</th>
                <th>Ratings</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td>
                    <Link to={`/stores/${store.id}`}>{store.name}</Link>
                  </td>
                  <td>{store.address}</td>
                  <td>
                    <StarRating value={store.avg_rating} readOnly size="sm" />
                  </td>
                  <td>{store.rating_count}</td>
                  <td className="table-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => viewRatings(store)}
                    >
                      Reviews
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeStore(store)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <Modal title="Add a new store" onClose={() => setShowCreate(false)}>
          <ErrorBanner message={formError} onClose={() => setFormError('')} />
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="store-name">Store name</label>
              <input
                id="store-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="store-email">Store email</label>
              <input
                id="store-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="store-address">Address</label>
              <input
                id="store-address"
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Create store'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {ratingsFor && (
        <Modal title={`Reviews for ${ratingsFor.store.name}`} onClose={() => setRatingsFor(null)}>
          {ratingsFor.ratings.length === 0 ? (
            <p>No reviews yet.</p>
          ) : (
            <ul className="rating-list">
              {ratingsFor.ratings.map((r) => (
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
        </Modal>
      )}
    </div>
  );
}