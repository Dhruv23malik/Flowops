import { useState, useCallback } from 'react';
import type { FlowNode, FlowNodeData } from './types';
import { getNodeTypeInfo } from './types';
import type { NodeType } from '../../../services/workflow.api';

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
        {/* Keyed by node.id so switching nodes resets local form state without effects */}
        <ConfigForm
          key={node.id}
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
      return (
        <ManualTriggerForm
          nodeId={nodeId}
          config={config as { sampleInput?: Record<string, unknown> }}
          onUpdateConfig={onUpdateConfig}
        />
      );
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
    case 'http_request':
      return (
        <HttpRequestForm
          nodeId={nodeId}
          config={config as { url?: string; method?: string; headers?: string; body?: string; outputKey?: string }}
          onUpdateConfig={onUpdateConfig}
        />
      );
    case 'delay':
      return (
        <DelayForm
          nodeId={nodeId}
          config={config as { seconds?: number }}
          onUpdateConfig={onUpdateConfig}
        />
      );
    case 'set_variable':
      return (
        <SetVariableForm
          nodeId={nodeId}
          config={config as { outputKey?: string; value?: string | number | boolean }}
          onUpdateConfig={onUpdateConfig}
        />
      );
    default:
      return <p>Unknown node type.</p>;
  }
}

// ─── Manual Trigger ──────────────────────────────────────────────

function ManualTriggerForm({
  nodeId,
  config,
  onUpdateConfig,
}: {
  nodeId: string;
  config: { sampleInput?: Record<string, unknown> };
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const [sampleJson, setSampleJson] = useState(() =>
    config.sampleInput ? JSON.stringify(config.sampleInput, null, 2) : '',
  );
  const [jsonError, setJsonError] = useState('');

  const handleApply = useCallback(() => {
    const trimmed = sampleJson.trim();
    if (!trimmed) {
      setJsonError('');
      onUpdateConfig(nodeId, {});
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Sample input must be a JSON object, e.g. {"feedback": "Great app!"}');
        return;
      }
      setJsonError('');
      onUpdateConfig(nodeId, { sampleInput: parsed });
    } catch {
      setJsonError('Invalid JSON syntax.');
    }
  }, [nodeId, sampleJson, onUpdateConfig]);

  return (
    <div className="config-form">
      <div className="config-form__message" style={{ marginBottom: 12 }}>
        <p>Starts the workflow manually or via webhook.</p>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="config-sample-input">
          Default / Sample Input (JSON)
        </label>
        <textarea
          id="config-sample-input"
          className="form-input form-textarea"
          value={sampleJson}
          onChange={(e) => setSampleJson(e.target.value)}
          placeholder='{"feedback": "Checkout failed with 500"}'
          rows={5}
        />
        <p className="config-form__hint">
          Optional. Available in later steps as <code>{'{{input.key}}'}</code>.
        </p>
        {jsonError && <p className="form-error">{jsonError}</p>}
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
          placeholder="Analyze {{input.feedback}} and return JSON with sentiment and urgency…"
          rows={4}
        />
        <p className="config-form__hint">
          Supports variables like <code>{'{{input.text}}'}</code> or <code>{'{{api_data.title}}'}</code>.
        </p>
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

  const handleApply = useCallback(() => {
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
          placeholder="e.g., summary.urgency"
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
          <option value="contains">contains</option>
          <option value="not_contains">not contains</option>
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
          placeholder="e.g., high"
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

// ─── HTTP Request ───────────────────────────────────────────────

function HttpRequestForm({
  nodeId,
  config,
  onUpdateConfig,
}: {
  nodeId: string;
  config: { url?: string; method?: string; headers?: string; body?: string; outputKey?: string };
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const [url, setUrl] = useState(config.url ?? '');
  const [method, setMethod] = useState(config.method ?? 'GET');
  const [headers, setHeaders] = useState(config.headers ?? '');
  const [body, setBody] = useState(config.body ?? '');
  const [outputKey, setOutputKey] = useState(config.outputKey ?? 'http_response');

  const handleApply = useCallback(() => {
    onUpdateConfig(nodeId, { url, method, headers, body, outputKey });
  }, [nodeId, url, method, headers, body, outputKey, onUpdateConfig]);

  return (
    <div className="config-form">
      <div className="form-group">
        <label className="form-label" htmlFor="config-url">URL</label>
        <input
          id="config-url"
          type="text"
          className="form-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/data"
        />
        <p className="config-form__hint">
          Supports <code>{'{{variable}}'}</code> interpolation. Internal/private IPs are blocked.
        </p>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="config-method">Method</label>
        <select
          id="config-method"
          className="form-select"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="config-headers">Headers (JSON)</label>
        <textarea
          id="config-headers"
          className="form-input form-textarea"
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
          placeholder='{"Authorization": "Bearer token"}'
          rows={2}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="config-body">Body (JSON)</label>
        <textarea
          id="config-body"
          className="form-input form-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder='{"summary": "{{summary}}"}'
          rows={3}
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
          placeholder="http_response"
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

// ─── Delay ──────────────────────────────────────────────────────

function DelayForm({
  nodeId,
  config,
  onUpdateConfig,
}: {
  nodeId: string;
  config: { seconds?: number };
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const [seconds, setSeconds] = useState(String(config.seconds ?? 5));

  const handleApply = useCallback(() => {
    const parsed = Math.floor(Number(seconds));
    onUpdateConfig(nodeId, { seconds: Number.isNaN(parsed) ? 5 : Math.min(3600, Math.max(1, parsed)) });
  }, [nodeId, seconds, onUpdateConfig]);

  return (
    <div className="config-form">
      <div className="form-group">
        <label className="form-label" htmlFor="config-seconds">Wait (seconds)</label>
        <input
          id="config-seconds"
          type="number"
          min={1}
          max={3600}
          step={1}
          className="form-input"
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
          placeholder="5"
        />
        <p className="config-form__hint">Pause the workflow for 1–3600 seconds.</p>
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

// ─── Set Variable ───────────────────────────────────────────────

function SetVariableForm({
  nodeId,
  config,
  onUpdateConfig,
}: {
  nodeId: string;
  config: { outputKey?: string; value?: string | number | boolean };
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const [outputKey, setOutputKey] = useState(config.outputKey ?? 'my_value');
  const [value, setValue] = useState(String(config.value ?? ''));

  const handleApply = useCallback(() => {
    let parsedValue: string | number | boolean = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (value !== '' && !isNaN(Number(value))) parsedValue = Number(value);

    onUpdateConfig(nodeId, { outputKey, value: parsedValue });
  }, [nodeId, outputKey, value, onUpdateConfig]);

  return (
    <div className="config-form">
      <div className="form-group">
        <label className="form-label" htmlFor="config-output-key">Output Key</label>
        <input
          id="config-output-key"
          type="text"
          className="form-input"
          value={outputKey}
          onChange={(e) => setOutputKey(e.target.value)}
          placeholder="my_value"
        />
        <p className="config-form__hint">
          Later steps read this as a field or <code>{'{{my_value}}'}</code>.
        </p>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="config-value">Value</label>
        <input
          id="config-value"
          type="text"
          className="form-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g., 70 or {{input.name}}"
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
