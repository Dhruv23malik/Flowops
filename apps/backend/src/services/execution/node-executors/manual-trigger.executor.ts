import { WorkflowNode } from '@flowops/schemas';
import { NodeExecutor } from '../node-executor';
import { ExecutionContext, NodeExecutionResult } from '../execution.types';

export class ManualTriggerExecutor implements NodeExecutor {
  async execute(
    _node: WorkflowNode,
    _context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    return {
      status: 'SUCCESS',
      output: { triggered: true, timestamp: new Date().toISOString() },
    };
  }
}
