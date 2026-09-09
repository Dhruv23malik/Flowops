import '../App.css';

export function SettingsPage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Account and application settings.</p>
      </div>
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-state-icon">⚙️</div>
          <h3 className="empty-state-title">Settings coming soon</h3>
          <p className="empty-state-text">
            Account settings and preferences will be available in a future phase.
          </p>
        </div>
      </div>
    </>
  );
}

export function ExecutionsPage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Executions</h1>
        <p className="page-subtitle">View and monitor workflow execution history.</p>
      </div>
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-state-icon">▶️</div>
          <h3 className="empty-state-title">Executions coming in Phase 5</h3>
          <p className="empty-state-text">
            Workflow execution and monitoring will be available after the workflow builder is implemented.
          </p>
        </div>
      </div>
    </>
  );
}
