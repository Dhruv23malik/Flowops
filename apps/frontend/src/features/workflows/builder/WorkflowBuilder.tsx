import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react';

import {
  apiGetWorkflow,
  apiUpdateWorkflow,
  apiGetWebhookInfo,
  type WebhookInfo,
  type WorkflowDetail,
  type NodeType,
  type WorkflowStatus,
} from '../../../services/workflow.api';
import { ApiException } from '../../../services/auth.api';
import {
  apiNodesToFlowNodes,
  apiEdgesToFlowEdges,
  flowNodesToApiNodes,
  flowEdgesToApiEdges,
  getNodeTypeInfo,
  type FlowNode,
  type FlowEdge,
  type FlowNodeData,
} from './types';
import { generateNodeId, generateEdgeId, getDefaultConfig, getDefaultPosition } from './utils/defaults';
import { validateWorkflowGraph } from './utils/validation';

import { WorkflowToolbar } from './WorkflowToolbar';
import { NodePalette } from './NodePalette';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WorkflowCanvas } from './WorkflowCanvas';
import { AIGenerationPanel } from './AIGenerationPanel';
import type { GeneratedWorkflow } from '../../../services/ai.api';
import { executionApi, type Execution } from '../../../services/execution.api';
import { ExecutionResultModal } from './ExecutionResultModal';
import { AIDebuggerPanel } from '../../../components/AIDebuggerPanel';
import { socketService } from '../../../services/socket';
import type { ExecutionStatus, StepStatus } from '@flowops/schemas';

type LiveExecutionState = {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  steps: Record<string, {
    id: string;
    nodeId: string;
    nodeType: string;
    status: StepStatus;
    duration?: number;
  }>;
};

import '../../../App.css';

function WorkflowBuilderInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ─── Loading & Error State ─────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // ─── Workflow Metadata ─────────────────────────────────────────
  const [savedWorkflow, setSavedWorkflow] = useState<WorkflowDetail | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('DRAFT');

  // ─── React Flow State ──────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

  // ─── UI State ──────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isDebuggerOpen, setIsDebuggerOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [lastExecution, setLastExecution] = useState<Execution | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [liveExecution, setLiveExecution] = useState<LiveExecutionState | null>(null);

  // ─── Run-with-Input Modal State ────────────────────────────────
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [runInputText, setRunInputText] = useState('{}');
  const [runInputError, setRunInputError] = useState('');

  // ─── Webhook Modal State ───────────────────────────────────────
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);

  // ─── Derived ───────────────────────────────────────────────────
  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [nodes, selectedNodeId],
  );

  const hasTrigger = useMemo(
    () => nodes.some((n) => (n.data as FlowNodeData).nodeType === 'manual_trigger'),
    [nodes],
  );

  // ─── Load Workflow ─────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let active = true;
    apiGetWorkflow(id)
      .then((wf) => {
        if (!active) return;
        setSavedWorkflow(wf);
        setWorkflowName(wf.name);
        setWorkflowStatus(wf.status);
        setNodes(apiNodesToFlowNodes(wf.nodes ?? []));
        setEdges(apiEdgesToFlowEdges(wf.edges ?? []));
        setIsDirty(false);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiException && err.status === 404) {
          setLoadError('Workflow not found.');
        } else {
          setLoadError('Failed to load workflow.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, setNodes, setEdges]);

  // ─── Track Dirty State ─────────────────────────────────────────
  const markDirty = useCallback(() => {
    setIsDirty(true);
    setSaveError(null);
    setValidationErrors([]);
  }, []);

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      const hasRealChange = changes.some((c) => c.type !== 'select');
      if (hasRealChange) markDirty();
    },
    [onNodesChange, markDirty],
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      const hasRealChange = changes.some((c) => c.type !== 'select');
      if (hasRealChange) markDirty();
    },
    [onEdgesChange, markDirty],
  );

  // ─── Connect Nodes ─────────────────────────────────────────────
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) return;
      const edgeId = generateEdgeId(
        connection.source,
        connection.target,
        connection.sourceHandle ?? undefined,
      );
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: edgeId,
            animated: true,
            style: { stroke: 'rgba(124, 58, 237, 0.6)', strokeWidth: 2 },
          },
          eds,
        ),
      );
      markDirty();
    },
    [setEdges, markDirty],
  );

  // ─── Add Node ──────────────────────────────────────────────────
  const handleAddNode = useCallback(
    (type: NodeType, position?: { x: number; y: number }) => {
      if (type === 'manual_trigger' && hasTrigger) return;

      const nodeId = generateNodeId();
      const pos = position ?? getDefaultPosition(nodes.length);
      const info = getNodeTypeInfo(type);
      const newNode: FlowNode = {
        id: nodeId,
        type,
        position: pos,
        data: {
          nodeType: type,
          config: getDefaultConfig(type),
          label: info.label,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      markDirty();
    },
    [nodes.length, hasTrigger, setNodes, markDirty],
  );

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleUpdateConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: { ...n.data, config } as FlowNodeData,
              }
            : n,
        ),
      );
      markDirty();
    },
    [setNodes, markDirty],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      markDirty();
    },
    [setNodes, setEdges, selectedNodeId, markDirty],
  );

  const handleNameChange = useCallback(
    (name: string) => {
      setWorkflowName(name);
      markDirty();
    },
    [markDirty],
  );

  const handleStatusChange = useCallback(
    async (nextStatus: WorkflowStatus) => {
      setWorkflowStatus(nextStatus);
      if (!id) return;
      try {
        const updated = await apiUpdateWorkflow(id, { status: nextStatus });
        setSavedWorkflow(updated);
      } catch {
        // Fallback: mark dirty so manual Save persists it
        markDirty();
      }
    },
    [id, markDirty],
  );

  // ─── Save Workflow ─────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!id || isSaving) return;

    const validation = validateWorkflowGraph(nodes as FlowNode[], edges);
    if (!validation.success) {
      setValidationErrors(validation.errors);
      setSaveError(validation.errors[0] ?? 'Invalid workflow graph.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setValidationErrors([]);

    try {
      const apiNodes = flowNodesToApiNodes(nodes as FlowNode[]);
      const apiEdges = flowEdgesToApiEdges(edges);

      const updated = await apiUpdateWorkflow(id, {
        name: workflowName,
        status: workflowStatus,
        nodes: apiNodes,
        edges: apiEdges,
      });

      setSavedWorkflow(updated);
      setWorkflowStatus(updated.status);
      setIsDirty(false);
    } catch (err) {
      if (err instanceof ApiException) {
        setSaveError(err.message);
      } else {
        setSaveError('Could not save workflow. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }, [id, isSaving, nodes, edges, workflowName, workflowStatus]);

  // ─── Apply AI Generated Workflow ───────────────────────────────
  const handleApplyAiWorkflow = useCallback((generated: GeneratedWorkflow) => {
    if (nodes.length > 0) {
      const confirmMsg = 'Applying the generated workflow will replace your current canvas.\n\nContinue?';
      if (!window.confirm(confirmMsg)) return;
    }

    setWorkflowName(generated.name);
    setNodes(apiNodesToFlowNodes(generated.nodes));
    setEdges(apiEdgesToFlowEdges(generated.edges));
    setIsAiPanelOpen(false);
    setSelectedNodeId(null);
    markDirty();
  }, [nodes.length, setNodes, setEdges, markDirty]);

  // ─── Socket.IO Real-Time Events ────────────────────────────────
  useEffect(() => {
    if (!id) return;

    socketService.on('execution:started', (data: any) => {
      if (data.workflowId === id) {
        setLiveExecution({
          executionId: data.executionId,
          workflowId: data.workflowId,
          status: data.status,
          steps: {},
        });
      }
    });

    const updateStep = (data: any) => {
      setLiveExecution((prev) =>
        prev && prev.executionId === data.executionId
          ? { ...prev, steps: { ...prev.steps, [data.step.nodeId]: data.step } }
          : prev,
      );
    };

    socketService.on('execution:step_started', updateStep);
    socketService.on('execution:step_completed', updateStep);
    socketService.on('execution:step_failed', updateStep);

    socketService.on('execution:completed', (data: any) => {
      setLiveExecution((prev) =>
        prev && prev.executionId === data.executionId ? { ...prev, status: data.status } : prev,
      );
    });

    socketService.on('execution:failed', (data: any) => {
      setLiveExecution((prev) =>
        prev && prev.executionId === data.executionId ? { ...prev, status: data.status } : prev,
      );
    });

    return () => {
      socketService.off('execution:started');
      socketService.off('execution:step_started');
      socketService.off('execution:step_completed');
      socketService.off('execution:step_failed');
      socketService.off('execution:completed');
      socketService.off('execution:failed');
    };
  }, [id]);

  // ─── Run Workflow (Open Input Modal -> Execute) ────────────────
  const handleOpenRunModal = useCallback(() => {
    if (!id || isRunning || isDirty) return;
    const triggerNode = nodes.find((n) => (n.data as FlowNodeData).nodeType === 'manual_trigger');
    const sampleInput = (triggerNode?.data as FlowNodeData | undefined)?.config?.sampleInput;
    setRunInputText(
      sampleInput && typeof sampleInput === 'object'
        ? JSON.stringify(sampleInput, null, 2)
        : '{}',
    );
    setRunInputError('');
    setIsRunModalOpen(true);
  }, [id, isRunning, isDirty, nodes]);

  const handleConfirmRun = useCallback(async () => {
    if (!id || isRunning) return;

    let parsedInput: Record<string, unknown> = {};
    const trimmed = runInputText.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setRunInputError('Input must be a JSON object (e.g. {"feedback": "Great!"})');
          return;
        }
        parsedInput = parsed;
      } catch {
        setRunInputError('Invalid JSON format.');
        return;
      }
    }

    setIsRunModalOpen(false);
    setIsRunning(true);
    setLiveExecution(null);
    try {
      const res = await executionApi.runWorkflow(id, parsedInput);
      setLastExecution(res.execution);
      setIsResultModalOpen(true);
    } catch (err: any) {
      const fallbackExec = {
        id: 'error',
        workflowId: id,
        workflowVersionId: '',
        status: 'FAILED',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: '1',
            executionId: 'error',
            nodeId: 'unknown',
            nodeType: 'system',
            status: 'FAILED',
            startedAt: null,
            completedAt: null,
            error: err.message || 'Execution request failed',
            output: null,
            createdAt: new Date().toISOString(),
          },
        ],
      } as Execution;
      setLastExecution(fallbackExec);
      setIsResultModalOpen(true);
    } finally {
      setIsRunning(false);
    }
  }, [id, isRunning, runInputText]);

  // ─── Webhook Modal ─────────────────────────────────────────────
  const handleOpenWebhook = useCallback(async () => {
    if (!id) return;
    setIsWebhookModalOpen(true);
    setWebhookCopied(false);
    try {
      const info = await apiGetWebhookInfo(id);
      setWebhookInfo(info);
    } catch {
      setWebhookInfo(null);
    }
  }, [id]);

  // ─── Loading State ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="builder-loading">
        <div className="spinner spinner-lg" />
        <span>Loading workflow…</span>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────
  if (loadError || !savedWorkflow) {
    return (
      <div className="builder-error">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">{loadError || 'Something went wrong'}</h3>
          <p className="empty-state-text">The workflow could not be loaded.</p>
          <Link to="/app/workflows" className="btn btn-secondary">
            Back to Workflows
          </Link>
        </div>
      </div>
    );
  }

  const curlSnippet = webhookInfo
    ? `curl -X POST "${webhookInfo.url}" \\\n  -H "Content-Type: application/json" \\\n  -H "x-flowops-webhook-token: ${webhookInfo.token}" \\\n  -d '{"message": "Hello from webhook"}'`
    : '';

  return (
    <div className="workflow-builder" id="workflow-builder">
      <WorkflowToolbar
        workflowName={workflowName}
        status={workflowStatus}
        isDirty={isDirty}
        isSaving={isSaving}
        saveError={saveError}
        onSave={handleSave}
        onNameChange={handleNameChange}
        onStatusChange={handleStatusChange}
        onBack={() => navigate('/app/workflows')}
        onGenerateAI={() => setIsAiPanelOpen(true)}
        onOpenWebhook={() => void handleOpenWebhook()}
        onRun={handleOpenRunModal}
        isRunning={isRunning}
      />

      {/* Validation errors banner */}
      {validationErrors.length > 0 && (
        <div className="builder-validation-errors" id="validation-errors">
          <strong>Please fix the following issues before saving:</strong>
          <ul>
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="builder-body">
        <NodePalette onAddNode={handleAddNode} hasTrigger={hasTrigger} />

        <WorkflowCanvas
          nodes={nodes.map((n: FlowNode) => ({
            ...n,
            data: {
              ...n.data,
              executionStatus: liveExecution?.steps[n.id]?.status,
            },
          }))}
          edges={edges}
          onNodesChange={handleNodesChange as OnNodesChange}
          onEdgesChange={handleEdgesChange as OnEdgesChange}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onAddNode={handleAddNode}
          hasTrigger={hasTrigger}
        />

        <NodeConfigPanel
          node={selectedNode as FlowNode | null}
          onUpdateConfig={handleUpdateConfig}
          onDeleteNode={handleDeleteNode}
          onClose={() => setSelectedNodeId(null)}
        />

        {liveExecution && (
          <div className="execution-panel">
            <div className="execution-panel-header">
              <h3>Execution #{liveExecution.executionId.slice(-4)}</h3>
              <span className={`status-text ${liveExecution.status.toLowerCase()}`}>{liveExecution.status}</span>
            </div>
            <div className="execution-panel-steps">
              {nodes.map((node) => {
                const step = liveExecution.steps[node.id];
                if (!step) {
                  return (
                    <div key={node.id} className="execution-step pending">
                      ○ {(node.data as any).label}
                    </div>
                  );
                }
                return (
                  <div key={node.id} className={`execution-step ${step.status.toLowerCase()}`}>
                    {step.status === 'SUCCESS' && '✓ '}
                    {step.status === 'RUNNING' && '⟳ '}
                    {step.status === 'FAILED' && '✕ '}
                    {step.status === 'SKIPPED' && '○ '}
                    {(node.data as any).label}
                    {step.duration !== undefined && <span className="duration">{step.duration}ms</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Run Input Modal */}
      {isRunModalOpen && (
        <div className="ai-modal-overlay">
          <div className="ai-modal" style={{ maxWidth: 500 }}>
            <div className="ai-modal__header">
              <h3 className="ai-modal__title">▶ Run Workflow</h3>
              <button className="ai-modal__close" onClick={() => setIsRunModalOpen(false)}>&times;</button>
            </div>
            <div className="ai-modal__body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 10 }}>
                Provide JSON input passed to the trigger (accessible via <code>{'{{input.key}}'}</code>).
              </p>
              <textarea
                className="form-input form-textarea"
                rows={6}
                value={runInputText}
                onChange={(e) => setRunInputText(e.target.value)}
                id="run-input-json"
              />
              {runInputError && (
                <div className="ai-modal__error" style={{ marginTop: 10 }}>{runInputError}</div>
              )}
              <div className="ai-modal__actions" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button className="btn btn-secondary" onClick={() => setIsRunModalOpen(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={() => void handleConfirmRun()} id="confirm-run-btn">
                  ▶ Run Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Info Modal */}
      {isWebhookModalOpen && (
        <div className="ai-modal-overlay">
          <div className="ai-modal" style={{ maxWidth: 580 }}>
            <div className="ai-modal__header">
              <h3 className="ai-modal__title">🔗 Webhook Trigger</h3>
              <button className="ai-modal__close" onClick={() => setIsWebhookModalOpen(false)}>&times;</button>
            </div>
            <div className="ai-modal__body">
              {workflowStatus !== 'ACTIVE' && (
                <div className="ai-modal__error" style={{ marginBottom: 12 }}>
                  This workflow is currently <strong>{workflowStatus}</strong>. Switch status to <strong>Active</strong> in the toolbar before calling the webhook externally.
                </div>
              )}
              {webhookInfo ? (
                <>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 10 }}>
                    Trigger this workflow from any app, GitHub action, or script using a POST request:
                  </p>
                  <pre
                    style={{
                      padding: 12,
                      background: 'var(--bg-base)',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      overflowX: 'auto',
                      marginBottom: 12,
                    }}
                  >
                    {curlSnippet}
                  </pre>
                  <div className="ai-modal__actions" style={{ justifyContent: 'space-between' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(curlSnippet);
                        setWebhookCopied(true);
                      }}
                    >
                      {webhookCopied ? '✓ Copied cURL' : 'Copy cURL'}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setIsWebhookModalOpen(false)}>
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>Loading webhook details…</p>
              )}
            </div>
          </div>
        </div>
      )}

      <AIGenerationPanel
        workflowId={id}
        isOpen={isAiPanelOpen}
        onClose={() => setIsAiPanelOpen(false)}
        onApply={handleApplyAiWorkflow}
      />

      <ExecutionResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        execution={lastExecution}
        onAskFlowOps={() => {
          setIsResultModalOpen(false);
          setIsDebuggerOpen(true);
        }}
      />

      {isDebuggerOpen && lastExecution && (
        <AIDebuggerPanel
          executionId={lastExecution.id}
          onClose={() => setIsDebuggerOpen(false)}
          onApplyFix={(fix) => {
            if (fix.type === 'update_node_config') {
              const node = nodes.find((n) => n.id === fix.nodeId);
              if (node) {
                const newConfig = { ...((node.data as any).config || {}), ...fix.changes };
                handleUpdateConfig(fix.nodeId, newConfig);
                setIsDebuggerOpen(false);
              }
            }
          }}
        />
      )}
    </div>
  );
}

export function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  );
}
