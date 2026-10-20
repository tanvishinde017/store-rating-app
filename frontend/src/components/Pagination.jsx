export default function Pagination({ pagination, onChange }) {
  if (!pagination || !pagination.pages || pagination.pages <= 1) {
    return null;
  }

  const { page, pages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <span className="pagination-info">
        Showing {from}-{to} of {total}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        <span className="pagination-page">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
        >
          Next
        </button>
      </div>
    </div>
  );
}