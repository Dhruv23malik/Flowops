import { WorkflowNode } from '@flowops/schemas';
import { NodeExecutor } from '../node-executor';
import { ExecutionContext, NodeExecutionResult } from '../execution.types';

export class ManualTriggerExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = (node.config ?? {}) as { sampleInput?: Record<string, unknown> };
    const hasRuntimeInput = context.input && Object.keys(context.input).length > 0;
    const effectiveInput = hasRuntimeInput
      ? context.input
      : (config.sampleInput && typeof config.sampleInput === 'object' ? config.sampleInput : {});

    return {
      status: 'SUCCESS',
      output: {
        ...effectiveInput,
        input: effectiveInput,
        triggered: true,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
