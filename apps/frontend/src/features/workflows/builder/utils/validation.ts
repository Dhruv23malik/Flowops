import type { FlowNode, FlowEdge } from '../types';
import { flowNodesToApiNodes, flowEdgesToApiEdges } from '../types';

export interface ValidationResult {
  success: boolean;
  errors: string[];
}

/**
 * Validate a workflow graph from React Flow nodes/edges.
 * Mirrors the shared schema validation but runs fully client-side.
 */
export function validateWorkflowGraph(
  nodes: FlowNode[],
  edges: FlowEdge[],
): ValidationResult {
  const errors: string[] = [];
  const apiNodes = flowNodesToApiNodes(nodes);
  const apiEdges = flowEdgesToApiEdges(edges);

  // At least one node
  if (apiNodes.length === 0) {
    errors.push('Workflow must have at least one node.');
    return { success: false, errors };
  }

  // Unique node IDs
  const nodeIds = new Set<string>();
  for (const node of apiNodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: "${node.id}".`);
    }
    nodeIds.add(node.id);
  }

  // At most one manual_trigger
  const triggerCount = apiNodes.filter((n) => n.type === 'manual_trigger').length;
  if (triggerCount > 1) {
    errors.push('A workflow can have at most one Manual Trigger node.');
  }

  // Validate node types
  const validTypes = new Set(['manual_trigger', 'ai_analyze', 'condition', 'save_result', 'http_request']);
  for (const node of apiNodes) {
    if (!validTypes.has(node.type)) {
      errors.push(`Node "${node.id}" has invalid type "${node.type}".`);
    }
  }

  // Validate node configs
  for (const node of apiNodes) {
    switch (node.type) {
      case 'ai_analyze': {
        const config = node.config as { prompt?: string };
        if (!config.prompt || (typeof config.prompt === 'string' && config.prompt.trim() === '')) {
          errors.push(`Node "${node.id}" (AI Analyze): Prompt is required.`);
        }
        break;
      }
      case 'condition': {
        const config = node.config as { field?: string; operator?: string; value?: unknown };
        if (!config.field || (typeof config.field === 'string' && config.field.trim() === '')) {
          errors.push(`Node "${node.id}" (Condition): Field is required.`);
        }
        if (!config.operator) {
          errors.push(`Node "${node.id}" (Condition): Operator is required.`);
        }
        break;
      }
      case 'save_result': {
        const config = node.config as { resultKey?: string };
        if (!config.resultKey || (typeof config.resultKey === 'string' && config.resultKey.trim() === '')) {
          errors.push(`Node "${node.id}" (Save Result): Result key is required.`);
        }
        break;
      }
      case 'http_request': {
        const config = node.config as { url?: string };
        if (!config.url || (typeof config.url === 'string' && config.url.trim() === '')) {
          errors.push(`Node "${node.id}" (HTTP Request): URL is required.`);
        }
        break;
      }
    }
  }

  // Validate edges
  for (const edge of apiEdges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge references unknown source node "${edge.source}".`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge references unknown target node "${edge.target}".`);
    }
    if (edge.source === edge.target) {
      errors.push(`Self-loop detected on node "${edge.source}".`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
