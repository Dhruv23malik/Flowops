import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGetWorkflow, apiUpdateWorkflow, type WorkflowDetail, type WorkflowStatus } from '../services/workflow.api';
import { ApiException } from '../services/auth.api';
import '../App.css';

export function WorkflowEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<WorkflowStatus>('DRAFT');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    apiGetWorkflow(id)
      .then((wf) => {
        setWorkflow(wf);
        setName(wf.name);
        setDescription(wf.description ?? '');
        setStatus(wf.status);
      })
      .catch(() => setError('Failed to load workflow.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !name.trim()) return;

    setError('');
    setIsSaving(true);

    try {
      await apiUpdateWorkflow(id, {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
      });
      navigate(`/app/workflows/${id}`);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to save changes. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-body">
        <div className="loading-container">
          <div className="spinner" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Workflow not found</h3>
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
          <Link
            to={`/app/workflows/${id}`}
            style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}
          >
            {workflow.name}
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Edit</span>
        </div>
        <h1 className="page-title">Edit Workflow</h1>
      </div>

      <div className="page-body">
        <div className="form-card">
          <h2 className="form-card-title">Workflow Settings</h2>
          <p className="form-card-subtitle">Update your workflow's name, description, and status.</p>

          {error && (
            <div className="auth-error" role="alert" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} id="edit-workflow-form" noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-name">Name *</label>
              <input
                id="edit-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-description">Description</label>
              <textarea
                id="edit-description"
                className="form-input form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this workflow does…"
                maxLength={1000}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-status">Status</label>
              <select
                id="edit-status"
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkflowStatus)}
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
              </select>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                id="save-workflow-btn"
                className="btn btn-primary"
                disabled={isSaving || !name.trim()}
              >
                {isSaving ? (
                  <>
                    <span className="spinner" />
                    Saving…
                  </>
                ) : 'Save Changes'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(`/app/workflows/${id}`)}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
