import { useState, useEffect, useCallback } from 'react';
import type { FlowNode, FlowNodeData } from './types';
import { getNodeTypeInfo } from './types';
import type { NodeType } from '../../services/workflow.api';

interface NodeConfigPanelProps {
  node: FlowNode | null;
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeConfigPanel({
  node,
  onUpdateConfig,
  onDeleteNode,
  onClose,
}: NodeConfigPanelProps) {
  if (!node) return null;

  const nodeData = node.data as FlowNodeData;
  const info = getNodeTypeInfo(nodeData.nodeType);

  return (
    <aside className="config-panel" id="node-config-panel">
      <div className="config-panel__header">
        <div className="config-panel__header-info">
          <span className={`config-panel__icon config-panel__icon--${nodeData.nodeType}`}>
            {info.icon}
          </span>
          <h3 className="config-panel__title">{info.label}</h3>
        </div>
        <button
          className="config-panel__close"
          onClick={onClose}
          title="Close panel"
          aria-label="Close configuration panel"
          id="close-config-panel"
        >
          ✕
        </button>
      </div>

      <div className="config-panel__body">
        <ConfigForm
          nodeId={node.id}
          nodeType={nodeData.nodeType}
          config={nodeData.config}
          onUpdateConfig={onUpdateConfig}
        />
      </div>

      <div className="config-panel__footer">
        <button
          className="btn btn-danger btn-sm"
          onClick={() => onDeleteNode(node.id)}
          id="delete-node-btn"
        >
          Delete Node
        </button>
      </div>
    </aside>
  );
}

// ─── Config Form Per Type ─────────────────────────────────────────

interface ConfigFormProps {
  nodeId: string;
  nodeType: NodeType;
  config: Record<string, unknown>;
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}

function ConfigForm({ nodeId, nodeType, config, onUpdateConfig }: ConfigFormProps) {
  switch (nodeType) {
    case 'manual_trigger':
      return <ManualTriggerForm />;
    case 'ai_analyze':
      return (
        <AiAnalyzeForm
          nodeId={nodeId}
          config={config as { prompt?: string; outputKey?: string }}
          onUpdateConfig={onUpdateConfig}
        />
      );
    case 'condition':
      return (
        <ConditionForm
          nodeId={nodeId}
          config={config as { field?: string; operator?: string; value?: string | number | boolean }}
          onUpdateConfig={onUpdateConfig}
        />
      );
    case 'save_result':
      return (
        <SaveResultForm
          nodeId={nodeId}
          config={config as { resultKey?: string }}
          onUpdateConfig={onUpdateConfig}
        />
      );
    default:
      return <p>Unknown node type.</p>;
  }
}

// ─── Manual Trigger ──────────────────────────────────────────────

function ManualTriggerForm() {
  return (
    <div className="config-form__message">
      <p>This node starts the workflow manually.</p>
      <p className="config-form__hint">No configuration required.</p>
    </div>
  );
}

// ─── AI Analyze ──────────────────────────────────────────────────

function AiAnalyzeForm({
  nodeId,
  config,
  onUpdateConfig,
}: {
  nodeId: string;
  config: { prompt?: string; outputKey?: string };
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const [prompt, setPrompt] = useState(config.prompt ?? '');
  const [outputKey, setOutputKey] = useState(config.outputKey ?? 'result');

  // Sync when node changes
  useEffect(() => {
    setPrompt(config.prompt ?? '');
    setOutputKey(config.outputKey ?? 'result');
  }, [nodeId, config.prompt, config.outputKey]);

  const handleApply = useCallback(() => {
    onUpdateConfig(nodeId, { prompt, outputKey });
  }, [nodeId, prompt, outputKey, onUpdateConfig]);

  return (
    <div className="config-form">
      <div className="form-group">
        <label className="form-label" htmlFor="config-prompt">Prompt</label>
        <textarea
          id="config-prompt"
          className="form-input form-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what this AI step should analyze…"
          rows={4}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="config-output-key">Output Key</label>
        <input
          id="config-output-key"
          type="text"
          className="form-input"
          value={outputKey}
          onChange={(e) => setOutputKey(e.target.value)}
          placeholder="result"
        />
      </div>
      <button
        className="btn btn-primary btn-sm"
        onClick={handleApply}
        id="apply-config-btn"
      >
        Apply Changes
      </button>
    </div>
  );
}

// ─── Condition ──────────────────────────────────────────────────

function ConditionForm({
  nodeId,
  config,
  onUpdateConfig,
}: {
  nodeId: string;
  config: { field?: string; operator?: string; value?: string | number | boolean };
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const [field, setField] = useState(config.field ?? '');
  const [operator, setOperator] = useState(config.operator ?? '==');
  const [value, setValue] = useState(String(config.value ?? ''));

  useEffect(() => {
    setField(config.field ?? '');
    setOperator(config.operator ?? '==');
    setValue(String(config.value ?? ''));
  }, [nodeId, config.field, config.operator, config.value]);

  const handleApply = useCallback(() => {
    // Try to parse value as number or boolean
    let parsedValue: string | number | boolean = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (value !== '' && !isNaN(Number(value))) parsedValue = Number(value);

    onUpdateConfig(nodeId, { field, operator, value: parsedValue });
  }, [nodeId, field, operator, value, onUpdateConfig]);

  return (
    <div className="config-form">
      <div className="form-group">
        <label className="form-label" htmlFor="config-field">Field</label>
        <input
          id="config-field"
          type="text"
          className="form-input"
          value={field}
          onChange={(e) => setField(e.target.value)}
          placeholder="e.g., score"
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="config-operator">Operator</label>
        <select
          id="config-operator"
          className="form-select"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
        >
          <option value="==">== (equals)</option>
          <option value="!=">!= (not equals)</option>
          <option value=">">&gt; (greater than)</option>
          <option value="<">&lt; (less than)</option>
          <option value=">=">&gt;= (greater or equal)</option>
          <option value="<=">&lt;= (less or equal)</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="config-value">Value</label>
        <input
          id="config-value"
          type="text"
          className="form-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g., 70"
        />
      </div>
      <button
        className="btn btn-primary btn-sm"
        onClick={handleApply}
        id="apply-config-btn"
      >
        Apply Changes
      </button>
    </div>
  );
}

// ─── Save Result ────────────────────────────────────────────────

function SaveResultForm({
  nodeId,
  config,
  onUpdateConfig,
}: {
  nodeId: string;
  config: { resultKey?: string };
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const [resultKey, setResultKey] = useState(config.resultKey ?? 'result');

  useEffect(() => {
    setResultKey(config.resultKey ?? 'result');
  }, [nodeId, config.resultKey]);

  const handleApply = useCallback(() => {
    onUpdateConfig(nodeId, { resultKey });
  }, [nodeId, resultKey, onUpdateConfig]);

  return (
    <div className="config-form">
      <div className="form-group">
        <label className="form-label" htmlFor="config-result-key">Result Key</label>
        <input
          id="config-result-key"
          type="text"
          className="form-input"
          value={resultKey}
          onChange={(e) => setResultKey(e.target.value)}
          placeholder="result"
        />
      </div>
      <button
        className="btn btn-primary btn-sm"
        onClick={handleApply}
        id="apply-config-btn"
      >
        Apply Changes
      </button>
    </div>
  );
}
