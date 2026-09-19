import { ApiException } from './auth.api';
import type { WorkflowNode, WorkflowEdge } from './workflow.api';

export interface GeneratedWorkflow {
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

const API_URL = import.meta.env.VITE_API_URL || '';

export async function apiGenerateWorkflow(prompt: string, workflowId?: string): Promise<GeneratedWorkflow> {
  const url = `${API_URL}/api/ai/generate-workflow`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, workflowId }),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = data?.error ?? { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred' };
    throw new ApiException(error.message, error.code, res.status);
  }

  return data?.data?.workflow as GeneratedWorkflow;
}

import type { AiDebugResponse } from '@flowops/schemas';

export async function apiDebugExecution(executionId: string): Promise<AiDebugResponse> {
  const url = `${API_URL}/api/ai/debug-execution`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ executionId }),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = data?.error ?? { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred' };
    throw new ApiException(error.message, error.code, res.status);
  }

  return data?.data as AiDebugResponse;
}
