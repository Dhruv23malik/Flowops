import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ApiException } from '../services/auth.api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'register' }: AuthModalProps) {
  const { login, register, logout, isGuest } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isGuest) {
        // Log out the guest before logging in / registering
        await logout();
      }

      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content auth-card" style={{ maxWidth: 400, margin: 'auto' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
        </div>

        <h2 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: 8 }}>
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="auth-subtitle" style={{ marginBottom: 24 }}>
          {mode === 'login' 
            ? 'Sign in to access your saved workflows.' 
            : 'Sign up to save your workflows permanently.'}
        </p>

        {error && (
          <div className="auth-error" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isLoading || !email || !password || (mode === 'register' && !name)}
          >
            {isLoading ? (
              <span className="spinner" style={{ marginRight: 8 }} />
            ) : null}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: 24, textAlign: 'center' }}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button 
                type="button"
                onClick={() => setMode('register')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, font: 'inherit' }}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button 
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, font: 'inherit' }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
