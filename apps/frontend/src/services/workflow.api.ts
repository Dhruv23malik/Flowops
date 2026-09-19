import { ApiException } from './auth.api';

// ─── Types ────────────────────────────────────────────────────────

export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED';
export type NodeType = 'manual_trigger' | 'ai_analyze' | 'condition' | 'save_result' | 'http_request';

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: WorkflowNodePosition;
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowDetail extends WorkflowListItem {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface CreateWorkflowData {
  name: string;
  description?: string;
  status?: WorkflowStatus;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string;
  status?: WorkflowStatus;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

// ─── API helper ───────────────────────────────────────────────────

async function workflowRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = data?.error ?? { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred' };
    throw new ApiException(error.message, error.code, res.status);
  }

  return data?.data as T;
}

// ─── Workflow API ─────────────────────────────────────────────────

export async function apiListWorkflows(): Promise<WorkflowListItem[]> {
  return workflowRequest<WorkflowListItem[]>('/api/workflows');
}

export async function apiGetWorkflow(id: string): Promise<WorkflowDetail> {
  return workflowRequest<WorkflowDetail>(`/api/workflows/${id}`);
}

export async function apiCreateWorkflow(data: CreateWorkflowData): Promise<WorkflowDetail> {
  return workflowRequest<WorkflowDetail>('/api/workflows', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateWorkflow(id: string, data: UpdateWorkflowData): Promise<WorkflowDetail> {
  return workflowRequest<WorkflowDetail>(`/api/workflows/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteWorkflow(id: string): Promise<void> {
  await workflowRequest<void>(`/api/workflows/${id}`, { method: 'DELETE' });
}

export { ApiException };
