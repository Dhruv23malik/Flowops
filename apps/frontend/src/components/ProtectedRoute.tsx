import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, loginAsGuest } = useAuth();
  const [isInitializingGuest, setIsInitializingGuest] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isInitializingGuest) {
      setIsInitializingGuest(true);
      loginAsGuest().catch(() => {
        // If guest login fails, we'll let it redirect to login
        setIsInitializingGuest(false);
      });
    }
  }, [isLoading, isAuthenticated, isInitializingGuest, loginAsGuest]);

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
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
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

  if (isAuthenticated) {
    return <Navigate to="/app/workflows" replace />;
  }

  return <Outlet />;
}
