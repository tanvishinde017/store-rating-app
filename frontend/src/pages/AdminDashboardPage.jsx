import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import StarRating from '../components/StarRating';

const EMPTY_USER = { name: '', email: '', address: '', password: '', role: 'USER' };

export default function AdminDashboardPage() {
  const [tab, setTab] = useState('users');

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userPagination, setUserPagination] = useState(null);
  const [stores, setStores] = useState([]);
  const [storePagination, setStorePagination] = useState(null);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_USER);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await adminApi.dashboard();
      setStats(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.users({ search, role, sortBy, sortOrder, page, limit: 10 });
      setUsers(data.users);
      setUserPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, role, sortBy, sortOrder, page]);

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.stores({ search, sortBy, sortOrder, page, limit: 10 });
      setStores(data.stores);
      setStorePagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, sortOrder, page]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'users') loadUsers();
      else loadStores();
    }, 250);
    return () => clearTimeout(timer);
  }, [tab, loadUsers, loadStores]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await adminApi.createUser({
        name: form.name,
        email: form.email,
        address: form.address,
        password: form.password,
        role: form.role,
      });
      setShowCreate(false);
      setForm(EMPTY_USER);
      setMessage('User created successfully.');
      loadUsers();
      loadStats();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (user, newRole) => {
    setError('');
    try {
      await adminApi.updateUser(user.id, { role: newRole });
      setMessage(`${user.name} is now a ${newRole}.`);
      loadUsers();
      loadStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) {
      return;
    }
    setError('');
    try {
      await adminApi.deleteUser(user.id);
      setMessage('User deleted.');
      loadUsers();
      loadStats();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Admin dashboard</h1>
        <p className="page-sub">Platform totals, user management and store oversight.</p>
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
          <span className="stat-value">{stats ? stats.totals.users : 0}</span>
          <span className="stat-label">Users</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats ? stats.totals.stores : 0}</span>
          <span className="stat-label">Stores</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats ? stats.totals.ratings : 0}</span>
          <span className="stat-label">Ratings</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats && stats.usersByRole ? stats.usersByRole.ADMIN || 0 : 0}</span>
          <span className="stat-label">Admins</span>
        </div>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={tab === 'users' ? 'tab active' : 'tab'}
          onClick={() => {
            setTab('users');
            setPage(1);
          }}
        >
          Users
        </button>
        <button
          type="button"
          className={tab === 'stores' ? 'tab active' : 'tab'}
          onClick={() => {
            setTab('stores');
            setPage(1);
          }}
        >
          Stores
        </button>
      </div>

      <div className="toolbar">
        <input
          className="toolbar-search"
          type="search"
          placeholder={tab === 'users' ? 'Search users…' : 'Search stores…'}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        {tab === 'users' && (
          <select
            className="toolbar-select"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="OWNER">Owner</option>
            <option value="USER">User</option>
          </select>
        )}

        <select
          className="toolbar-select"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setPage(1);
          }}
          aria-label="Sort by"
        >
          <option value="name">Name</option>
          <option value="email">Email</option>
          <option value="created_at">Created</option>
        </select>

        <select
          className="toolbar-select"
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value);
            setPage(1);
          }}
          aria-label="Sort order"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>

        {tab === 'users' && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreate(true)}
          >
            New user
          </button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'users' ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Address</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="table-empty">
                    No users match your filters.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.address}</td>
                  <td>
                    <select
                      className="role-select"
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      <option value="USER">USER</option>
                      <option value="OWNER">OWNER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="table-actions">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeUser(u)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Address</th>
                <th>Owner</th>
                <th>Rating</th>
                <th>Ratings</th>
              </tr>
            </thead>
            <tbody>
              {stores.length === 0 && (
                <tr>
                  <td colSpan="5" className="table-empty">
                    No stores match your search.
                  </td>
                </tr>
              )}
              {stores.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/stores/${s.id}`}>{s.name}</Link>
                  </td>
                  <td>{s.address}</td>
                  <td>{s.owner_name || '—'}</td>
                  <td>
                    <StarRating value={s.avg_rating} readOnly size="sm" />
                  </td>
                  <td>{s.rating_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        pagination={tab === 'users' ? userPagination : storePagination}
        onChange={setPage}
      />

      {showCreate && (
        <Modal title="Create a user" onClose={() => setShowCreate(false)}>
          <ErrorBanner message={formError} onClose={() => setFormError('')} />
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="new-name">Full name</label>
              <input
                id="new-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-email">Email</label>
              <input
                id="new-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-address">Address</label>
              <input
                id="new-address"
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-password">Password</label>
              <input
                id="new-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="8-16 chars, 1 uppercase, 1 symbol"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-role">Role</label>
              <select
                id="new-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="USER">USER</option>
                <option value="OWNER">OWNER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}