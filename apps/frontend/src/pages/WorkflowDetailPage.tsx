import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGetWorkflow, apiDeleteWorkflow, type WorkflowDetail } from '../services/workflow.api';
import { ApiException } from '../services/auth.api';
import '../App.css';

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge ${status.toLowerCase()}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGetWorkflow(id)
      .then(setWorkflow)
      .catch((err) => {
        if (err instanceof ApiException && err.status === 404) {
          setError('Workflow not found.');
        } else {
          setError('Failed to load workflow.');
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await apiDeleteWorkflow(id);
      navigate('/app/workflows');
    } catch {
      setError('Failed to delete workflow.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-body">
        <div className="loading-container">
          <div className="spinner" />
          <span>Loading workflow…</span>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">{error || 'Something went wrong'}</h3>
          <p className="empty-state-text">The workflow could not be loaded.</p>
          <Link to="/app/workflows" className="btn btn-secondary">Back to Workflows</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Link to="/app/workflows" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Workflows
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{workflow.name}</span>
        </div>
      </div>

      <div className="page-body">
        <div className="workflow-detail">
          {/* Header */}
          <div className="workflow-detail-header">
            <div>
              <h1 className="workflow-detail-title">{workflow.name}</h1>
              <div style={{ marginTop: 8 }}>
                <StatusBadge status={workflow.status} />
              </div>
            </div>
            <div className="workflow-detail-actions">
              <Link
                to={`/app/workflows/${id}/edit`}
                className="btn btn-secondary btn-sm"
                id="edit-workflow-btn"
              >
                Edit
              </Link>
              <button
                className="btn btn-danger btn-sm"
                id="delete-workflow-btn"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </button>
              <button
                className="btn btn-secondary btn-sm"
                id="run-workflow-btn"
                disabled
                title="Workflow execution coming in Phase 5"
              >
                ▶ Run
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="workflow-meta-block">
            <div className="workflow-meta-row">
              <span className="workflow-meta-key">Description</span>
              <span className="workflow-meta-value">
                {workflow.description ?? <em style={{ color: 'var(--text-muted)' }}>No description</em>}
              </span>
            </div>
            <div className="workflow-meta-row">
              <span className="workflow-meta-key">Status</span>
              <span className="workflow-meta-value">
                <StatusBadge status={workflow.status} />
              </span>
            </div>
            <div className="workflow-meta-row">
              <span className="workflow-meta-key">Created</span>
              <span className="workflow-meta-value">{formatDate(workflow.createdAt)}</span>
            </div>
            <div className="workflow-meta-row">
              <span className="workflow-meta-key">Last updated</span>
              <span className="workflow-meta-value">{formatDate(workflow.updatedAt)}</span>
            </div>
          </div>

          {/* Workflow Builder Placeholder */}
          <div className="phase-placeholder">
            <div className="phase-placeholder-icon">🔧</div>
            <strong>Workflow builder coming in Phase 3.</strong>
            <p style={{ marginTop: 6, color: 'var(--text-muted)' }}>
              You'll be able to visually connect nodes and build automations here.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-title">Delete Workflow</h3>
            <p className="confirm-text">
              Are you sure you want to delete <strong>"{workflow.name}"</strong>? This action
              cannot be undone.
            </p>
            <div className="confirm-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                id="confirm-delete-btn"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <><span className="spinner" /> Deleting…</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
