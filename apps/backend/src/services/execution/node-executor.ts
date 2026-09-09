import { WorkflowNode } from '@flowops/schemas';
import { ExecutionContext, NodeExecutionResult } from './execution.types';

export interface NodeExecutor {
  execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult>;
}
