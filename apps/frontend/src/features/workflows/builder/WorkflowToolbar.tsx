import { useState, useRef, useEffect } from 'react';
import type { WorkflowStatus } from '../../../services/workflow.api';

interface WorkflowToolbarProps {
  workflowName: string;
  status: WorkflowStatus;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  onSave: () => void;
  onNameChange: (name: string) => void;
  onBack: () => void;
  onGenerateAI: () => void;
  onRun: () => void;
  isRunning: boolean;
}

export function WorkflowToolbar({
  workflowName,
  status,
  isDirty,
  isSaving,
  saveError,
  onSave,
  onNameChange,
  onBack,
  onGenerateAI,
  onRun,
  isRunning,
}: WorkflowToolbarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(workflowName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(workflowName);
  }, [workflowName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmitName = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== workflowName) {
      onNameChange(trimmed);
    } else {
      setEditValue(workflowName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitName();
    } else if (e.key === 'Escape') {
      setEditValue(workflowName);
      setIsEditing(false);
    }
  };

  const statusLabel = status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <div className="builder-toolbar" id="workflow-toolbar">
      <div className="builder-toolbar__left">
        <button
          className="builder-toolbar__back"
          onClick={onBack}
          title="Back to workflows"
          aria-label="Back to workflows"
          id="back-to-workflows-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Workflows</span>
        </button>
      </div>

      <div className="builder-toolbar__center">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="builder-toolbar__name-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmitName}
            onKeyDown={handleKeyDown}
            maxLength={200}
            aria-label="Workflow name"
            id="workflow-name-input"
          />
        ) : (
          <button
            className="builder-toolbar__name"
            onClick={() => setIsEditing(true)}
            title="Click to rename"
            id="workflow-name-btn"
          >
            {workflowName}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6, opacity: 0.5 }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        <span className={`status-badge ${status.toLowerCase()}`} style={{ marginLeft: 10 }}>
          {statusLabel}
        </span>
      </div>

      <div className="builder-toolbar__right">
        {/* Save state indicator */}
        <span className="builder-toolbar__save-state" id="save-state-indicator">
          {isSaving ? (
            <>
              <span className="spinner" /> Saving…
            </>
          ) : saveError ? (
            <span className="builder-toolbar__save-error" title={saveError}>⚠ Error</span>
          ) : isDirty ? (
            <span className="builder-toolbar__unsaved">● Unsaved changes</span>
          ) : (
            <span className="builder-toolbar__saved">✓ Saved</span>
          )}
        </span>

        <button
          className="btn btn-sm"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff', border: 'none' }}
          onClick={onGenerateAI}
          id="generate-ai-btn"
        >
          ✦ Generate with AI
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={onSave}
          disabled={isSaving}
          id="save-workflow-btn"
        >
          {isSaving ? (
            <>
              <span className="spinner" /> Saving…
            </>
          ) : 'Save'}
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onRun}
          disabled={isRunning || isDirty || isSaving || status === 'DRAFT'}
          title={isDirty ? "Save before running" : "Run this workflow"}
          id="run-workflow-btn"
        >
          {isRunning ? (
            <><span className="spinner" /> Running…</>
          ) : (
            '▶ Run'
          )}
        </button>
      </div>
    </div>
  );
}
