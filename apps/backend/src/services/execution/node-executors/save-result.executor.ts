import { WorkflowNode } from '@flowops/schemas';
import { NodeExecutor } from '../node-executor';
import { ExecutionContext, NodeExecutionResult } from '../execution.types';

export class SaveResultExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.config as Record<string, unknown>;
    const resultKey = config.resultKey as string;

    if (!resultKey) {
      return {
        status: 'FAILED',
        error: 'Save Result node missing resultKey configuration',
      };
    }

    // Capture the specified key from context (or everything if not found, for safety)
    const dataToSave = context.outputs[resultKey] !== undefined 
      ? context.outputs[resultKey] 
      : context.outputs;

    return {
      status: 'SUCCESS',
      output: {
        saved_key: resultKey,
        saved_data: dataToSave,
      },
    };
  }
}
