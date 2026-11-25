import type { WorkflowDetail } from '../services/workflow.api';
import {
  apiNodesToFlowNodes,
  apiEdgesToFlowEdges,
} from '../features/workflows/builder/types';
import { validateWorkflowGraph } from '../features/workflows/builder/utils/validation';

export interface WorkflowExport {
  flowopsVersion: 2;
  exportedAt: string;
  name: string;
  description: string | null;
  nodes: WorkflowDetail['nodes'];
  edges: WorkflowDetail['edges'];
}

export interface ParsedWorkflowImport {
  name: string;
  description: string | null;
  nodes: WorkflowDetail['nodes'];
  edges: WorkflowDetail['edges'];
}

export function buildWorkflowExport(detail: WorkflowDetail): WorkflowExport {
  return {
    flowopsVersion: 2,
    exportedAt: new Date().toISOString(),
    name: detail.name,
    description: detail.description,
    nodes: detail.nodes,
    edges: detail.edges,
  };
}

/** Download a workflow as a `.flowops.json` file. */
export function downloadWorkflowExport(detail: WorkflowDetail): void {
  const data = buildWorkflowExport(detail);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${detail.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'workflow'}.flowops.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse + validate an imported `.flowops.json` file. Throws a
 * human-readable Error on anything invalid, so the caller can show it.
 */
export function parseWorkflowImport(text: string): ParsedWorkflowImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('That file is not a valid workflow export.');
  }
  const d = data as Record<string, unknown>;
  if (typeof d.name !== 'string' || d.name.trim() === '') {
    throw new Error('Workflow file is missing a name.');
  }
  if (!Array.isArray(d.nodes) || !Array.isArray(d.edges)) {
    throw new Error('Workflow file is missing nodes or edges.');
  }

  const nodes = d.nodes as WorkflowDetail['nodes'];
  const edges = d.edges as WorkflowDetail['edges'];
  const validation = validateWorkflowGraph(
    apiNodesToFlowNodes(nodes),
    apiEdgesToFlowEdges(edges),
  );
  if (!validation.success) {
    throw new Error(`Workflow failed validation: ${validation.errors[0]}`);
  }

  return {
    name: d.name.trim(),
    description: typeof d.description === 'string' ? d.description : null,
    nodes,
    edges,
  };
}
