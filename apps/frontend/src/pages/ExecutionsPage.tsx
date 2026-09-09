import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { executionApi, type Execution } from '../../services/execution.api';
import '../App.css';

export function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    executionApi.listExecutions()
      .then(res => setExecutions(res.executions))
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return '-';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    return (duration / 1000).toFixed(1) + 's';
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Executions</h1>
        <p className="page-subtitle">View and monitor workflow execution history.</p>
      </div>
      <div className="page-body">
        {isLoading ? (
          <div className="spinner spinner-lg" style={{ margin: '40px auto', display: 'block' }} />
        ) : error ? (
          <div className="empty-state">
            <h3 className="empty-state-title">Error loading executions</h3>
            <p className="empty-state-text">{error}</p>
          </div>
        ) : executions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">▶️</div>
            <h3 className="empty-state-title">No executions yet</h3>
            <p className="empty-state-text">
              Run your workflows from the builder to see their history here.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="workflows-table">
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {executions.map(exec => (
                  <tr key={exec.id}>
                    <td>
                      <Link to={`/app/executions/${exec.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {exec.workflow?.name || 'Unknown Workflow'}
                      </Link>
                    </td>
                    <td>
                      <span className={`status-badge ${exec.status.toLowerCase()}`}>
                        {exec.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDuration(exec.startedAt, exec.completedAt)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatTimeAgo(exec.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
