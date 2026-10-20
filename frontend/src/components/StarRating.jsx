import { useState } from 'react';

export default function StarRating({ value, onChange, readOnly = false, size = 'md' }) {
  const [hover, setHover] = useState(0);
  const display = hover || value || 0;

  return (
    <div className={`star-rating ${readOnly ? 'read-only' : ''} size-${size}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          className={`star ${star <= display ? 'filled' : ''}`}
          onClick={() => !readOnly && onChange && onChange(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          disabled={readOnly}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      {readOnly && <span className="star-value">{value ? value.toFixed(1) : '—'}</span>}
    </div>
  );
}