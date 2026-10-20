import { useCallback, useEffect, useState } from 'react';
import { storeApi } from '../api';
import { useAuth } from '../context/AuthContext';
import StoreCard from '../components/StoreCard';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import Pagination from '../components/Pagination';

export default function StoreListPage() {
  const { user } = useAuth();

  const [stores, setStores] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [myRatings, setMyRatings] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await storeApi.list({ search, sortBy, sortOrder, page, limit: 12 });
      setStores(data.stores);
      setPagination(data.pagination);
      // The API returns user_rating for the signed-in user, so cards can prefill.
      const map = {};
      for (const store of data.stores) {
        if (store.user_rating) {
          map[store.id] = store.user_rating;
        }
      }
      setMyRatings(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, sortOrder, page]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);


  const handleRate = async (storeId, rating) => {
    try {
      const data = await storeApi.rate(storeId, rating);
      setMyRatings((prev) => ({ ...prev, [storeId]: rating }));
      setStores((prev) =>
        prev.map((s) =>
          s.id === storeId
            ? { ...s, avg_rating: data.avg_rating, rating_count: data.rating_count }
            : s
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Stores</h1>
        <p className="page-sub">Search, sort and rate the stores in the directory.</p>
      </div>

      <div className="toolbar">
        <input
          className="toolbar-search"
          type="search"
          placeholder="Search by name, email or address…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

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
          <option value="address">Address</option>
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
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />

      {loading ? (
        <Spinner label="Loading stores…" />
      ) : stores.length === 0 ? (
        <div className="empty-state">
          <h3>No stores found</h3>
          <p>Try a different search term.</p>
        </div>
      ) : (
        <div className="store-grid">
          {stores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              rating={myRatings[store.id] || 0}
              onRate={user ? (value) => handleRate(store.id, value) : null}
            />
          ))}
        </div>
      )}

      <Pagination pagination={pagination} onChange={setPage} />
    </div>
  );
}