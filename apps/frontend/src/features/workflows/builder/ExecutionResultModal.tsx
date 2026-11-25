import { Link } from 'react-router-dom';
import type { Execution } from '../../../services/execution.api';

interface ExecutionResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  execution: Execution | null;
  onAskFlowOps?: () => void;
}

export function ExecutionResultModal({ isOpen, onClose, execution, onAskFlowOps }: ExecutionResultModalProps) {
  if (!isOpen || !execution) return null;

  const isSuccess = execution.status === 'SUCCESS';
  const statusColor = isSuccess ? 'var(--success)' : 'var(--error)';
  const statusIcon = isSuccess ? '✓' : '✕';

  const calculateDuration = () => {
    if (!execution.startedAt || !execution.completedAt) return null;
    const start = new Date(execution.startedAt).getTime();
    const end = new Date(execution.completedAt).getTime();
    return ((end - start) / 1000).toFixed(1) + 's';
  };

  const duration = calculateDuration();
  const steps = execution.steps ?? [];
  const failedStep = steps.find((s) => s.status === 'FAILED') ?? steps[steps.length - 1];

  return (
    <div className="ai-modal-overlay">
      <div className="ai-modal" style={{ maxWidth: 620 }}>
        <div className="ai-modal__header">
          <h2 className="ai-modal__title">Execution {isSuccess ? 'Complete' : 'Failed'}</h2>
          <button className="ai-modal__close" onClick={onClose}>&times;</button>
        </div>
        <div className="ai-modal__body">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 36, color: statusColor, fontWeight: 'bold' }}>
              {statusIcon} {execution.status}
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.9rem' }}>
              {steps.length} step{steps.length !== 1 ? 's' : ''} {isSuccess ? 'completed' : 'executed'}
              {duration ? ` • ${duration}` : ''}
            </p>
          </div>

          {!isSuccess && failedStep && (
            <div className="ai-modal__error" style={{ marginBottom: 16 }}>
              <strong>Failed Step:</strong> {failedStep.nodeType} ({failedStep.nodeId})
              <br />
              <strong>Reason:</strong> {failedStep.error || 'Unknown error'}
            </div>
          )}

          {steps.length > 0 && (
            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 6,
                    padding: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: step.output ? 6 : 0 }}>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                      {i + 1}. {step.nodeType.replace('_', ' ')}
                    </strong>
                    <span className={`status-badge ${step.status.toLowerCase()}`}>{step.status}</span>
                  </div>
                  {step.output && Object.keys(step.output).length > 0 && (
                    <pre
                      style={{
                        margin: 0,
                        padding: 8,
                        background: 'var(--bg-base)',
                        borderRadius: 4,
                        fontSize: '0.78rem',
                        overflowX: 'auto',
                        maxHeight: 140,
                      }}
                    >
                      {JSON.stringify(step.output, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="ai-modal__actions" style={{ justifyContent: 'center', gap: 12 }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            {execution.id !== 'error' && (
              <Link to={`/app/executions/${execution.id}`} className="btn btn-secondary">
                View Full Trace
              </Link>
            )}
            {!isSuccess && onAskFlowOps && (
              <button
                className="btn btn-primary"
                onClick={onAskFlowOps}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none',
                }}
              >
                <span>✦</span> Ask FlowOps
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
