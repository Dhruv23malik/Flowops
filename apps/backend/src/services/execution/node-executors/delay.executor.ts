import { WorkflowNode } from '@flowops/schemas';
import { NodeExecutor } from '../node-executor';
import { ExecutionContext, NodeExecutionResult } from '../execution.types';

export class DelayExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode,
    _context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.config as Record<string, unknown>;
    const seconds = config.seconds as number;

    if (
      typeof seconds !== 'number' ||
      !Number.isInteger(seconds) ||
      seconds < 1 ||
      seconds > 3600
    ) {
      return {
        status: 'FAILED',
        error: 'Delay node requires seconds as a whole number between 1 and 3600',
      };
    }

    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));

    return {
      status: 'SUCCESS',
      output: { delayedSeconds: seconds },
    };
  }
}
