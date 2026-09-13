import { Link } from 'react-router-dom';
import '../App.css';

export function NotFoundPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', background: 'var(--bg-base)' }}>
      <h1 style={{ fontSize: '4rem', margin: 0, color: 'var(--primary)' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: 24, color: 'var(--text-primary)' }}>Page not found</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/app/workflows" className="btn btn-primary">
        Back to Dashboard
      </Link>
    </div>
  );
}
