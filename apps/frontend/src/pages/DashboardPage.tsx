import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { apiListWorkflows, type WorkflowListItem } from '../services/workflow.api';
import { executionApi } from '../services/execution.api';
import { computeExecutionStats, formatDuration } from '../utils/execution-stats';
import '../App.css';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

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

export function DashboardPage() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ runsThisMonth: 0, failedThisMonth: 0, successRate: null as number | null, avgDurationMs: null as number | null });

  useEffect(() => {
    apiListWorkflows()
      .then(setWorkflows)
      .catch(console.error)
      .finally(() => setIsLoading(false));
    executionApi
      .listExecutions()
      .then(({ executions }) => setStats(computeExecutionStats(executions)))
      .catch(console.error);
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const recentWorkflows = workflows.slice(0, 5);

  return (
    <>
      <div className="page-header">
        <div className="greeting">
          <h1 className="greeting-title">{getGreeting()}, {firstName} 👋</h1>
          <p className="greeting-subtitle">Automate your work. Turn ideas into flows.</p>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Workflows</div>
            <div className="stat-value">{isLoading ? '—' : workflows.length}</div>
            <div className="stat-description">Total workflows created</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Runs</div>
            <div className="stat-value">{isLoading ? '—' : stats.runsThisMonth}</div>
            <div className="stat-description">Executions this month</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Failed</div>
            <div className="stat-value">{isLoading ? '—' : stats.failedThisMonth}</div>
            <div className="stat-description">Failed executions this month</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Success rate</div>
            <div className="stat-value">{isLoading ? '—' : stats.successRate === null ? '—' : `${Math.round(stats.successRate * 100)}%`}</div>
            <div className="stat-description">
              {stats.avgDurationMs === null ? 'No completed runs yet' : `Avg run ${formatDuration(stats.avgDurationMs)}`}
            </div>
          </div>
        </div>

        {/* Recent Workflows */}
        <div className="section-header">
          <h2 className="section-title">Recent Workflows</h2>
          <Link to="/app/workflows" className="btn btn-sm btn-secondary">View all</Link>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <div className="spinner" />
            <span>Loading workflows…</span>
          </div>
        ) : recentWorkflows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚡</div>
            <h3 className="empty-state-title">No workflows yet</h3>
            <p className="empty-state-text">
              Create your first workflow to get started automating your processes.
            </p>
            <Link to="/app/workflows/new" className="btn btn-primary" id="dashboard-create-btn">
              + Create Workflow
            </Link>
          </div>
        ) : (
          <div className="workflow-list">
            {recentWorkflows.map((wf) => (
              <Link
                key={wf.id}
                to={`/app/workflows/${wf.id}`}
                className="workflow-card"
              >
                <div className="workflow-card-info">
                  <div className="workflow-card-name">{wf.name}</div>
                  {wf.description && (
                    <div className="workflow-card-desc">{wf.description}</div>
                  )}
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
