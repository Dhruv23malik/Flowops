import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNode, WorkflowEdge, NodeType } from '../../services/workflow.api';

// ─── Node Data Types ──────────────────────────────────────────────

export interface ManualTriggerConfig {
  [key: string]: never;
}

export interface AiAnalyzeConfig {
  prompt: string;
  outputKey?: string;
}

export interface ConditionConfig {
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string | number | boolean;
}

export interface SaveResultConfig {
  resultKey: string;
}

export type NodeConfig =
  | ManualTriggerConfig
  | AiAnalyzeConfig
  | ConditionConfig
  | SaveResultConfig;

export interface FlowNodeData extends Record<string, unknown> {
  nodeType: NodeType;
  config: Record<string, unknown>;
  label: string;
}

// ─── Type alias for React Flow ─────────────────────────────────

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;

// ─── Node metadata ─────────────────────────────────────────────

export interface NodeTypeInfo {
  type: NodeType;
  label: string;
  description: string;
  category: string;
  icon: string;
}

export const NODE_TYPE_INFO: NodeTypeInfo[] = [
  {
    type: 'manual_trigger',
    label: 'Manual Trigger',
    description: 'Starts a workflow manually.',
    category: 'TRIGGER',
    icon: '◉',
  },
  {
    type: 'ai_analyze',
    label: 'AI Analyze',
    description: 'Analyze input using AI.',
    category: 'AI',
    icon: '✦',
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branch based on a value.',
    category: 'LOGIC',
    icon: '◇',
  },
  {
    type: 'save_result',
    label: 'Save Result',
    description: 'Store a workflow result.',
    category: 'OUTPUT',
    icon: '↓',
  },
];

export function getNodeTypeInfo(type: NodeType): NodeTypeInfo {
  return NODE_TYPE_INFO.find((n) => n.type === type)!;
}

// ─── Converters: API ↔ React Flow ──────────────────────────────

export function apiNodesToFlowNodes(nodes: WorkflowNode[]): FlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type, // matches the custom node type key in nodeTypes registry
    position: node.position,
    data: {
      nodeType: node.type,
      config: node.config,
      label: getNodeTypeInfo(node.type).label,
    },
  }));
}

export function apiEdgesToFlowEdges(edges: WorkflowEdge[]): FlowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    animated: true,
    style: { stroke: 'rgba(124, 58, 237, 0.6)', strokeWidth: 2 },
  }));
}

export function flowNodesToApiNodes(nodes: FlowNode[]): WorkflowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: (node.data as FlowNodeData).nodeType,
    position: node.position,
    config: (node.data as FlowNodeData).config,
  }));
}

export function flowEdgesToApiEdges(edges: FlowEdge[]): WorkflowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
  }));
}
