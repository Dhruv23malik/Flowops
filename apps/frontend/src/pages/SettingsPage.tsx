import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

export function SettingsPage() {
  const { user, isGuest, logout, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleUpgrade = async () => {
    setFormError('');
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    setIsSaving(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the account. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—';

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Account and application settings.</p>
      </div>
      <div className="page-body">
        {/* Account */}
        <div className="section-header">
          <h2 className="section-title">Account</h2>
        </div>
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Name</div>
            <div className="stat-value" style={{ fontSize: '1.1rem' }}>{user?.name ?? 'Guest'}</div>
            <div className="stat-description">{user?.email}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Account type</div>
            <div className="stat-value" style={{ fontSize: '1.1rem' }}>{isGuest ? 'Guest' : 'Registered'}</div>
            <div className="stat-description">
              {isGuest ? 'Work is saved to a temporary guest account.' : `Member since ${memberSince}`}
            </div>
          </div>
        </div>

        {/* Guest upgrade */}
        {isGuest && (
          <>
            <div className="section-header">
              <h2 className="section-title">Save your work</h2>
            </div>
            <p className="page-subtitle" style={{ marginBottom: 16 }}>
              Guest accounts are temporary. Create a free account to keep your workflows.
            </p>
            {formError && (
              <div className="auth-error" role="alert" style={{ marginBottom: 16 }}>
                {formError}
              </div>
            )}
            <div className="config-form" style={{ maxWidth: 420 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="settings-name">Name</label>
                <input
                  id="settings-name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="settings-email">Email</label>
                <input
                  id="settings-email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="settings-password">Password</label>
                <input
                  id="settings-password"
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleUpgrade}
                disabled={isSaving || !email || !password}
                id="upgrade-account-btn"
              >
                {isSaving ? 'Creating account…' : 'Create account'}
              </button>
            </div>
          </>
        )}

        {/* Session */}
        <div className="section-header" style={{ marginTop: 32 }}>
          <h2 className="section-title">Session</h2>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => void logout()} id="sign-out-btn">
          Sign out
        </button>
      </div>
    </>
  );
}
