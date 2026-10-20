export default function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="alert alert-error">
      <span>{message}</span>
      {onClose && (
        <button type="button" className="alert-close" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}