import React, { useState } from 'react';
import type { AiDebugResponse } from '@flowops/schemas';
import { apiDebugExecution } from '../services/ai.api';

interface AIDebuggerPanelProps {
  executionId: string;
  onApplyFix?: (fix: any) => void;
  onClose: () => void;
}

export function AIDebuggerPanel({ executionId, onApplyFix, onClose }: AIDebuggerPanelProps) {
  const [diagnosis, setDiagnosis] = useState<AiDebugResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [didFetch, setDidFetch] = useState(false);

  const fetchDiagnosis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiDebugExecution(executionId);
      setDiagnosis(res);
      setDidFetch(true);
    } catch (err: any) {
      setError(err.message || 'Debugger unavailable. Please review the failed step manually.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (!didFetch && !isLoading) {
      fetchDiagnosis();
    }
  }, [executionId, didFetch, isLoading]);

  return (
    <div className="ai-debugger-panel" style={{
      position: 'fixed',
      right: 24,
      bottom: 24,
      width: 400,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 8,
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--primary)' }}>✦</span> FlowOps Debugger
        </h4>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem'
        }}>&times;</button>
      </div>

      <div style={{ padding: 16, flex: 1, overflowY: 'auto', maxHeight: '60vh' }}>
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
            <div className="spinner" />
            <div style={{ color: 'var(--text-secondary)' }}>Analyzing failure...</div>
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--error)' }}>
            {error}
          </div>
        )}

        {diagnosis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <strong style={{ display: 'block', marginBottom: 4, color: 'var(--text-primary)' }}>Diagnosis</strong>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{diagnosis.diagnosis}</div>
            </div>
            
            <div>
              <strong style={{ display: 'block', marginBottom: 4, color: 'var(--text-primary)' }}>Probable Cause</strong>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{diagnosis.probableCause}</div>
            </div>

            <div>
              <strong style={{ display: 'block', marginBottom: 4, color: 'var(--text-primary)' }}>Suggested Fix</strong>
              {diagnosis.suggestedFix.type === 'no_safe_fix' ? (
                <div style={{ padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, fontSize: '0.85rem' }}>
                  No safe automatic fix was identified. Review the node configuration manually.
                </div>
              ) : (
                <div style={{ padding: 12, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, fontSize: '0.85rem' }}>
                  Update {diagnosis.suggestedFix.nodeId} with new configuration.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {diagnosis && (
        <div style={{ padding: 16, borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {diagnosis.suggestedFix.type === 'update_node_config' && onApplyFix && (
            <button className="btn btn-primary" onClick={() => onApplyFix(diagnosis.suggestedFix)}>
              Apply Fix
            </button>
          )}
        </div>
      )}
    </div>
  );
}
