import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCreateWorkflow } from '../services/workflow.api';
import { ApiException } from '../services/auth.api';
import '../App.css';

export function WorkflowNewPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Create Workflow</h1>
        <p className="page-subtitle">Set up a new automation workflow.</p>
      </div>

      <div className="page-body">
        <div className="form-card">
          <h2 className="form-card-title">Workflow Details</h2>
          <p className="form-card-subtitle">
            Give your workflow a name and description. You'll add nodes in Phase 3.
          </p>

          {error && (
            <div className="auth-error" role="alert" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

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
