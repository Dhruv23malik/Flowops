import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiListWorkflows, type WorkflowListItem } from '../services/workflow.api';
import '../App.css';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge ${status.toLowerCase()}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiListWorkflows()
      .then(setWorkflows)
      .catch(() => setError('Failed to load workflows. Please refresh.'))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = workflows.filter(
    (wf) =>
      wf.name.toLowerCase().includes(search.toLowerCase()) ||
      (wf.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Workflows</h1>
        <p className="page-subtitle">Manage and monitor your automation workflows.</p>
      </div>

      <div className="page-body">
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
          <div className="search-input-wrapper" style={{ marginBottom: 0 }}>
            <svg className="search-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              id="workflow-search"
              className="search-input"
              placeholder="Search workflows…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Link to="/app/workflows/new" className="btn btn-primary btn-sm" id="new-workflow-btn">
            + New Workflow
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="auth-error" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner" />
            <span>Loading workflows…</span>
          </div>
        ) : filtered.length === 0 ? (
          workflows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⚡</div>
              <h3 className="empty-state-title">No workflows yet</h3>
              <p className="empty-state-text">
                Create your first workflow and start automating your processes.
              </p>
              <Link to="/app/workflows/new" className="btn btn-primary" id="empty-create-btn">
                Create Workflow
              </Link>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3 className="empty-state-title">No results</h3>
              <p className="empty-state-text">No workflows match "{search}".</p>
            </div>
          )
        ) : (
          <div className="workflow-list">
            {filtered.map((wf) => (
              <Link
                key={wf.id}
                to={`/app/workflows/${wf.id}`}
                className="workflow-card"
                id={`workflow-${wf.id}`}
              >
                <div className="workflow-card-info">
                  <div className="workflow-card-name">{wf.name}</div>
                  <div className="workflow-card-desc">
                    {wf.description ?? 'No description'}
                  </div>
                </div>
                <div className="workflow-card-meta">
                  <StatusBadge status={wf.status} />
                  <span className="workflow-card-time">{timeAgo(wf.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
