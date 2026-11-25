import { apiRequest } from './auth.api';
import type { ExecutionStatus, StepStatus } from '@flowops/schemas';

export interface ExecutionStep {
  id: string;
  executionId: string;
  nodeId: string;
  nodeType: string;
  status: StepStatus;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  output: Record<string, any> | null;
  createdAt: string;
}

export interface Execution {
  id: string;
  workflowId: string;
  workflowVersionId: string;
  status: ExecutionStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  workflow?: { name: string };
  steps?: ExecutionStep[];
}

export const executionApi = {
  async runWorkflow(
    workflowId: string,
    input?: Record<string, unknown>,
  ): Promise<{ execution: Execution }> {
    return apiRequest<{ execution: Execution }>(`/api/workflows/${workflowId}/run`, {
      method: 'POST',
      body: JSON.stringify(input ? { input } : {}),
    });
  },

  async listExecutions(): Promise<{ executions: Execution[] }> {
    return apiRequest<{ executions: Execution[] }>('/api/executions', {
      method: 'GET',
    });
  },

  async getExecution(id: string): Promise<{ execution: Execution }> {
    return apiRequest<{ execution: Execution }>(`/api/executions/${id}`, {
      method: 'GET',
    });
  },
};
