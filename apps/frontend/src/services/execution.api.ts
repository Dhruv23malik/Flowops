import { fetchWithAuth } from './auth.api';

export interface ExecutionStep {
  id: string;
  executionId: string;
  nodeId: string;
  nodeType: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
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
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  workflow?: { name: string };
  steps?: ExecutionStep[];
}

export const executionApi = {
  async runWorkflow(workflowId: string): Promise<{ execution: Execution }> {
    return fetchWithAuth<{ execution: Execution }>(`/api/workflows/${workflowId}/run`, {
      method: 'POST',
    });
  },

  async listExecutions(): Promise<{ executions: Execution[] }> {
    return fetchWithAuth<{ executions: Execution[] }>('/api/executions', {
      method: 'GET',
    });
  },

  async getExecution(id: string): Promise<{ execution: Execution }> {
    return fetchWithAuth<{ execution: Execution }>(`/api/executions/${id}`, {
      method: 'GET',
    });
  },
};
