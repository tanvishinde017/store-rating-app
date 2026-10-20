import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  const features = [
    {
      title: 'Discover stores',
      body: 'Browse every store in the directory with ratings, addresses and owner details.',
    },
    {
      title: 'Rate in one click',
      body: 'Give any store a score from 1 to 5. Your rating updates instantly and averages recalculate.',
    },
    {
      title: 'Role aware',
      body: 'Users rate stores, owners manage their storefronts, and admins oversee the whole platform.',
    },
  ];

  return (
    <div className="page home">
      <section className="hero">
        <h1 className="hero-title">Rate the stores you know</h1>
        <p className="hero-text">
          A simple platform for discovering stores, sharing honest ratings, and giving
          owners a clear view of their customer feedback.
        </p>
        <div className="hero-actions">
          {user ? (
            <Link to="/stores" className="btn btn-primary">
              Browse stores
            </Link>
          ) : (
            <>
              <Link to="/signup" className="btn btn-primary">
                Get started
              </Link>
              <Link to="/login" className="btn btn-ghost">
                I already have an account
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="feature-grid">
        {features.map((f) => (
          <div className="feature-card" key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}