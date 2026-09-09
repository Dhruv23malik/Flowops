import { WorkflowNode } from '@flowops/schemas';
import { NodeExecutor } from '../node-executor';
import { ExecutionContext, NodeExecutionResult } from '../execution.types';

export class ConditionExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.config as Record<string, unknown>;
    const field = config.field as string;
    const operator = config.operator as string;
    const compareValue = config.value;

    if (!field || !operator) {
      return {
        status: 'FAILED',
        error: 'Condition node missing field or operator configuration',
      };
    }

    const actualValue = this.resolveField(field, context.outputs);

    let isTrue = false;
    switch (operator) {
      case '==':
        isTrue = actualValue == compareValue; // allow coercion
        break;
      case '!=':
        isTrue = actualValue != compareValue;
        break;
      case '>':
        isTrue = Number(actualValue) > Number(compareValue);
        break;
      case '<':
        isTrue = Number(actualValue) < Number(compareValue);
        break;
      case '>=':
        isTrue = Number(actualValue) >= Number(compareValue);
        break;
      case '<=':
        isTrue = Number(actualValue) <= Number(compareValue);
        break;
      default:
        return {
          status: 'FAILED',
          error: `Unknown operator: ${operator}`,
        };
    }

    return {
      status: 'SUCCESS',
      branch: isTrue ? 'yes' : 'no',
      output: { conditionResult: isTrue, actualValue, compareValue },
    };
  }

  private resolveField(path: string, obj: any): any {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
  }
}
