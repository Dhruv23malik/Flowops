import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { executionApi, type Execution } from '../services/execution.api';
import '../App.css';

export function ExecutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    executionApi.getExecution(id)
      .then(res => setExecution(res.execution))
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return '-';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    return (duration / 1000).toFixed(1) + 's';
  };

  if (isLoading) {
    return <div className="spinner spinner-lg" style={{ margin: '40px auto', display: 'block' }} />;
  }

  if (error || !execution) {
    return (
      <div className="empty-state" style={{ marginTop: 40 }}>
        <h3 className="empty-state-title">{error || 'Execution not found'}</h3>
        <Link to="/app/executions" className="btn btn-primary" style={{ marginTop: 16 }}>Back to Executions</Link>
      </div>
    );
  }

  const duration = formatDuration(execution.startedAt, execution.completedAt);
  const isSuccess = execution.status === 'SUCCESS';

  return (
    <>
      <div className="page-header">
        <div>
          <Link to="/app/executions" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', fontSize: '0.9rem', marginBottom: 8 }}>
            ← Back to Executions
          </Link>
          <h1 className="page-title">Execution #{execution.id.substring(0, 8)}</h1>
          <p className="page-subtitle">Workflow: {execution.workflow?.name}</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
          <div className="stat-card">
            <div className="stat-card-title">Status</div>
            <div className="stat-card-value" style={{ color: isSuccess ? 'var(--success)' : execution.status === 'FAILED' ? 'var(--error)' : 'var(--text-primary)' }}>
              {execution.status}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-title">Duration</div>
            <div className="stat-card-value">{duration}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-title">Started</div>
            <div className="stat-card-value">{new Date(execution.createdAt).toLocaleString()}</div>
          </div>
        </div>

        <h3>Steps</h3>
        <div className="steps-list" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {execution.steps?.map((step, idx) => (
            <div key={step.id} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              padding: 16,
              borderLeft: `4px solid ${step.status === 'SUCCESS' ? 'var(--success)' : step.status === 'FAILED' ? 'var(--error)' : 'var(--border-default)'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ textTransform: 'capitalize' }}>
                  {idx + 1}. {step.nodeType.replace('_', ' ')}
                </strong>
                <span className={`status-badge ${step.status.toLowerCase()}`}>{step.status}</span>
              </div>
              
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Duration: {formatDuration(step.startedAt, step.completedAt)}
              </div>

              {step.error && (
                <div style={{ marginTop: 12, padding: 8, background: 'rgba(239,68,68,0.1)', color: 'var(--error)', borderRadius: 4, fontSize: '0.85rem' }}>
                  <strong>Error:</strong> {step.error}
                </div>
              )}

              {step.output && Object.keys(step.output).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Output:</div>
                  <pre style={{ 
                    margin: 0, 
                    padding: 8, 
                    background: 'var(--bg-base)', 
                    borderRadius: 4, 
                    fontSize: '0.8rem',
                    overflowX: 'auto' 
                  }}>
                    {JSON.stringify(step.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
          
          {(!execution.steps || execution.steps.length === 0) && (
            <p style={{ color: 'var(--text-muted)' }}>No steps executed.</p>
          )}
        </div>
      </div>
    </>
  );
}
