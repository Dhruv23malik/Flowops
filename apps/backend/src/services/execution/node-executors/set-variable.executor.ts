import { WorkflowNode } from '@flowops/schemas';
import { NodeExecutor } from '../node-executor';
import { ExecutionContext, NodeExecutionResult } from '../execution.types';
import { interpolateTemplate } from '../template.utils';

/**
 * Set Variable stores a value under a key in the workflow's outputs, so
 * later steps can read it (Condition resolves its field as a dot-path into
 * outputs, and Save Result can capture it). The engine merges each step's
 * returned `output` into `context.outputs`, so returning the pair here is
 * all it takes — there is no separate variables store to keep in sync.
 */
export class SetVariableExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.config as Record<string, unknown>;
    const outputKey = config.outputKey as string;
    const rawValue = config.value;

    if (!outputKey || typeof outputKey !== 'string' || outputKey.trim() === '') {
      return {
        status: 'FAILED',
        error: 'Set Variable node missing outputKey configuration',
      };
    }

    if (rawValue === undefined) {
      return {
        status: 'FAILED',
        error: 'Set Variable node missing value configuration',
      };
    }

    const value = typeof rawValue === 'string'
      ? interpolateTemplate(rawValue, context.outputs)
      : rawValue;

    return {
      status: 'SUCCESS',
      output: { [outputKey]: value },
    };
  }
}
