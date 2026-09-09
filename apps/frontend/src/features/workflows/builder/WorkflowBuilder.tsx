import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
} from '@xyflow/react';

import {
  apiGetWorkflow,
  apiUpdateWorkflow,
  type WorkflowDetail,
  type NodeType,
  type WorkflowStatus,
} from '../../services/workflow.api';
import { ApiException } from '../../services/auth.api';
import {
  apiNodesToFlowNodes,
  apiEdgesToFlowEdges,
  flowNodesToApiNodes,
  flowEdgesToApiEdges,
  getNodeTypeInfo,
  type FlowNode,
  type FlowNodeData,
} from './types';
import { generateNodeId, generateEdgeId, getDefaultConfig, getDefaultPosition } from './utils/defaults';
import { validateWorkflowGraph } from './utils/validation';

import { WorkflowToolbar } from './WorkflowToolbar';
import { NodePalette } from './NodePalette';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WorkflowCanvas } from './WorkflowCanvas';
import { AIGenerationPanel } from './AIGenerationPanel';
import type { GeneratedWorkflow } from '../../services/ai.api';
import { executionApi, type Execution } from '../../services/execution.api';
import { ExecutionResultModal } from './ExecutionResultModal';

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
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // ─── UI State ──────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [lastExecution, setLastExecution] = useState<Execution | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

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
    setIsLoading(true);
    apiGetWorkflow(id)
      .then((wf) => {
        setSavedWorkflow(wf);
        setWorkflowName(wf.name);
        setWorkflowStatus(wf.status);
        setNodes(apiNodesToFlowNodes(wf.nodes ?? []));
        setEdges(apiEdgesToFlowEdges(wf.edges ?? []));
        setIsDirty(false);
      })
      .catch((err) => {
        if (err instanceof ApiException && err.status === 404) {
          setLoadError('Workflow not found.');
        } else {
          setLoadError('Failed to load workflow.');
        }
      })
      .finally(() => setIsLoading(false));
  }, [id, setNodes, setEdges]);

  // ─── Track Dirty State ─────────────────────────────────────────
  // We mark dirty on any user interaction that changes the graph
  const markDirty = useCallback(() => {
    setIsDirty(true);
    setSaveError(null);
    setValidationErrors([]);
  }, []);

  // Override onNodesChange to track dirty
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      // Only mark dirty for meaningful changes (not selection)
      const hasRealChange = changes.some(
        (c) => c.type !== 'select'
      );
      if (hasRealChange) markDirty();
    },
    [onNodesChange, markDirty],
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      const hasRealChange = changes.some(
        (c) => c.type !== 'select'
      );
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
      // Prevent multiple triggers
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

  // ─── Select Node ──────────────────────────────────────────────
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // ─── Update Node Config ────────────────────────────────────────
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

  // ─── Delete Node ──────────────────────────────────────────────
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      markDirty();
    },
    [setNodes, setEdges, selectedNodeId, markDirty],
  );

  // ─── Rename Workflow ──────────────────────────────────────────
  const handleNameChange = useCallback(
    (name: string) => {
      setWorkflowName(name);
      markDirty();
    },
    [markDirty],
  );

  // ─── Save Workflow ─────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!id || isSaving) return;

    // Validate graph
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
  }, [id, isSaving, nodes, edges, workflowName]);

  // ─── Apply AI Generated Workflow ───────────────────────────────
  const handleApplyAiWorkflow = useCallback((generated: GeneratedWorkflow) => {
    if (nodes.length > 0) {
      const confirmMsg = "Applying the generated workflow will replace your current canvas.\n\nContinue?";
      if (!window.confirm(confirmMsg)) return;
    }

    setWorkflowName(generated.name);
    setNodes(apiNodesToFlowNodes(generated.nodes));
    setEdges(apiEdgesToFlowEdges(generated.edges));
    setIsAiPanelOpen(false);
    setSelectedNodeId(null);
    markDirty();
  }, [nodes.length, setNodes, setEdges, markDirty]);

  // ─── Run Workflow ──────────────────────────────────────────────
  const handleRunWorkflow = useCallback(async () => {
    if (!id || isRunning || isDirty || workflowStatus === 'DRAFT') return;
    setIsRunning(true);
    try {
      const res = await executionApi.runWorkflow(id);
      setLastExecution(res.execution);
      setIsResultModalOpen(true);
    } catch (err: any) {
      // In case of an API/network error outside of execution bounds
      const fallbackExec = {
        id: 'error',
        workflowId: id,
        workflowVersionId: '',
        status: 'FAILED',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        steps: [{
          id: '1',
          executionId: 'error',
          nodeId: 'unknown',
          nodeType: 'system',
          status: 'FAILED',
          startedAt: null,
          completedAt: null,
          error: err.message || 'Execution request failed',
          output: null,
          createdAt: new Date().toISOString()
        }]
      } as Execution;
      setLastExecution(fallbackExec);
      setIsResultModalOpen(true);
    } finally {
      setIsRunning(false);
    }
  }, [id, isRunning, isDirty, workflowStatus]);

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
        onBack={() => navigate('/app/workflows')}
        onGenerateAI={() => setIsAiPanelOpen(true)}
        onRun={handleRunWorkflow}
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
          nodes={nodes as FlowNode[]}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
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
      </div>

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
      />
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
