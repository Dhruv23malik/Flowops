import { WorkflowNode } from '@flowops/schemas';

export interface ExecutionContext {
  input: Record<string, unknown>;
  outputs: Record<string, unknown>;
  variables: Record<string, unknown>;
}

export interface NodeExecutionResult {
  status: 'SUCCESS' | 'FAILED';
  output?: Record<string, unknown>;
  error?: string;
  branch?: string; // used for condition nodes (e.g. 'yes' or 'no')
}
