import { Link } from 'react-router-dom';
import StarRating from './StarRating';

export default function StoreCard({ store, onRate, rating }) {
  return (
    <article className="store-card">
      <div className="store-card-head">
        <h3 className="store-name">{store.name}</h3>
        <span className="store-rating">
          <StarRating value={store.avg_rating} readOnly size="sm" />
        </span>
      </div>

      <p className="store-address">{store.address}</p>
      <p className="store-email">{store.email}</p>

      <div className="store-card-meta">
        <span>{store.rating_count || 0} ratings</span>
        {store.owner_name && <span>Owner: {store.owner_name}</span>}
      </div>

      <div className="store-card-actions">
        <Link to={`/stores/${store.id}`} className="btn btn-ghost btn-sm">
          View details
        </Link>
        {onRate && (
          <div className="rate-inline">
            <span className="rate-label">Your rating</span>
            <StarRating value={rating} onChange={onRate} size="sm" />
          </div>
        )}
      </div>
    </article>
  );
}