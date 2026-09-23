import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiException } from '../services/auth.api';
import '../App.css';

export function RegisterPage() {
  const { register, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!email) errors.email = 'Email is required';
    if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    return errors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      await register(name.trim(), email, password);
      navigate('/app/workflows', { replace: true });
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Unable to connect to server. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <span className="auth-logo-text">FlowOps</span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join FlowOps and start automating your workflows.</p>

        {error && (
          <div className="auth-error" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} id="register-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">Name</label>
            <input
              id="register-name"
              type="text"
              className={`form-input${fieldErrors.name ? ' error' : ''}`}
              placeholder="Dhruv Malik"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoFocus
            />
            {fieldErrors.name && <p className="form-error">{fieldErrors.name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              className={`form-input${fieldErrors.email ? ' error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {fieldErrors.email && <p className="form-error">{fieldErrors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              className={`form-input${fieldErrors.password ? ' error' : ''}`}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {fieldErrors.password && <p className="form-error">{fieldErrors.password}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-confirm">Confirm Password</label>
            <input
              id="register-confirm"
              type="password"
              className={`form-input${fieldErrors.confirmPassword ? ' error' : ''}`}
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <p className="form-error">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            id="register-submit"
            className="btn btn-primary btn-full"
            disabled={isLoading}
            style={{ marginTop: 8 }}
          >
            {isLoading ? (
              <>
                <span className="spinner" />
                Creating account…
              </>
            ) : 'Create account'}
          </button>
          
          <div style={{ marginTop: 16, textAlign: 'center', position: 'relative' }}>
            <hr style={{ borderColor: 'var(--border-color)', margin: '0' }} />
            <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-surface)', padding: '0 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>or</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-full"
            style={{ marginTop: 16 }}
            onClick={async () => {
              try {
                setIsLoading(true);
                await loginAsGuest();
                navigate('/app/workflows', { replace: true });
              } catch (err) {
                setError('Failed to login as guest.');
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
          >
            Continue as Guest
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
