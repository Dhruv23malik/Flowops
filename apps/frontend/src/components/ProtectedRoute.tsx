import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { useEffect, useRef, useState } from 'react';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, loginAsGuest } = useAuth();
  const [guestLoginFailed, setGuestLoginFailed] = useState(false);
  const startedGuestRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !guestLoginFailed && !startedGuestRef.current) {
      startedGuestRef.current = true;
      loginAsGuest().catch(() => {
        setGuestLoginFailed(true);
      });
    }
  }, [isLoading, isAuthenticated, guestLoginFailed, loginAsGuest]);

  const isInitializingGuest = !isLoading && !isAuthenticated && !guestLoginFailed;

  if (isLoading || isInitializingGuest) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-base)',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div className="auth-logo-icon" style={{ fontSize: '2rem' }}>⚡</div>
        <div className="spinner spinner-lg" />
        <p style={{ margin: 0, color: 'var(--text-primary)' }}>Waking up the FlowOps server…</p>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          First visit can take up to a minute — the free server sleeps when idle.
        </p>
      </div>
    );
  }

  // Fallback if guest login completely fails for some reason
  if (!isAuthenticated || guestLoginFailed) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-base)',
          gap: '16px',
        }}
      >
        <div className="auth-logo-icon" style={{ fontSize: '2rem' }}>⚡</div>
        <h2 style={{ margin: 0 }}>Connection Failed</h2>
        <p style={{ color: 'var(--text-secondary)' }}>We couldn't connect to the server to sign you in.</p>
        <button 
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return <Outlet />;
}
