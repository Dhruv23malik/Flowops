import { Component, type ErrorInfo, type ReactNode } from 'react';
import '../App.css';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', background: 'var(--bg-base)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 16, color: 'var(--error)' }}>Something went wrong.</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            An unexpected error occurred in the application.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
            <a href="/app/workflows" className="btn btn-secondary">
              Back to Dashboard
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
