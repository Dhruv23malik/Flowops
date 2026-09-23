import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, loginAsGuest } = useAuth();
  const [isInitializingGuest, setIsInitializingGuest] = useState(false);
  const [guestLoginFailed, setGuestLoginFailed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isInitializingGuest && !guestLoginFailed) {
      setIsInitializingGuest(true);
      loginAsGuest().catch(() => {
        setIsInitializingGuest(false);
        setGuestLoginFailed(true);
      });
    }
  }, [isLoading, isAuthenticated, isInitializingGuest, guestLoginFailed, loginAsGuest]);

  if (isLoading || isInitializingGuest) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-base)',
        }}
      >
        <div className="spinner spinner-lg" />
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
