import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCreateWorkflow } from '../services/workflow.api';
import { ApiException } from '../services/auth.api';
import { REAL_WORLD_TEMPLATES, type WorkflowTemplate } from '../features/workflows/templates';
import '../App.css';

export function WorkflowNewPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workflow name is required.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const workflow = await apiCreateWorkflow({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      navigate(`/app/workflows/${workflow.id}`);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to create workflow. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTemplate = async (tpl: WorkflowTemplate) => {
    setError('');
    setCreatingTemplateId(tpl.id);
    try {
      const workflow = await apiCreateWorkflow({
        name: tpl.name,
        description: tpl.description,
        status: 'ACTIVE',
        nodes: tpl.nodes,
        edges: tpl.edges,
      });
      navigate(`/app/workflows/${workflow.id}`);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Failed to create workflow from template.');
      setCreatingTemplateId(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Create Workflow</h1>
        <p className="page-subtitle">Start from a real-world template or build a custom workflow from scratch.</p>
      </div>

      <div className="page-body">
        {error && (
          <div className="auth-error" role="alert" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        <div className="section-header" style={{ marginBottom: 12 }}>
          <h2 className="section-title">Ready-to-Use Templates</h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 14,
            marginBottom: 32,
          }}
        >
          {REAL_WORLD_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="stat-card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}
            >
              <div>
                <div className="stat-label">{tpl.category}</div>
                <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: 4, color: 'var(--text-primary)' }}>
                  {tpl.name}
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.45 }}>
                  {tpl.description}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void handleUseTemplate(tpl)}
                disabled={isLoading || creatingTemplateId !== null}
              >
                {creatingTemplateId === tpl.id ? 'Creating…' : 'Use Template →'}
              </button>
            </div>
          ))}
        </div>

        <div className="form-card">
          <h2 className="form-card-title">Blank Workflow</h2>
          <p className="form-card-subtitle">
            Give your workflow a name and description. You'll add nodes in the builder next — or describe the workflow in plain language and let AI generate it for you.
          </p>

          <form onSubmit={handleSubmit} id="create-workflow-form" noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="workflow-name">Name *</label>
              <input
                id="workflow-name"
                type="text"
                className="form-input"
                placeholder="Customer Feedback Analysis"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="workflow-description">Description</label>
              <textarea
                id="workflow-description"
                className="form-input form-textarea"
                placeholder="Describe what this workflow does…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                id="create-workflow-submit"
                className="btn btn-primary"
                disabled={isLoading || !name.trim()}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Creating…
                  </>
                ) : 'Create Workflow'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/app/workflows')}
                disabled={isLoading}
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
