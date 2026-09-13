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
  const stepCount = execution.steps?.length || 0;

  return (
    <div className="ai-modal-overlay">
      <div className="ai-modal">
        <div className="ai-modal__header">
          <h2 className="ai-modal__title">Execution {isSuccess ? 'Complete' : 'Failed'}</h2>
          <button className="ai-modal__close" onClick={onClose}>&times;</button>
        </div>
        <div className="ai-modal__body">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 48, color: statusColor, fontWeight: 'bold' }}>
              {statusIcon} {execution.status}
            </div>
            {duration && <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Duration: {duration}</p>}
            <p style={{ color: 'var(--text-secondary)' }}>{stepCount} steps {isSuccess ? 'completed' : 'executed'}</p>
          </div>

          {!isSuccess && execution.steps && execution.steps.length > 0 && (
            <div className="ai-modal__error">
              <strong>Failed Step:</strong> {execution.steps[execution.steps.length - 1].nodeType}
              <br />
              <strong>Reason:</strong> {execution.steps[execution.steps.length - 1].error || 'Unknown error'}
            </div>
          )}

          <div className="ai-modal__actions" style={{ justifyContent: 'center', gap: 12 }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
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
