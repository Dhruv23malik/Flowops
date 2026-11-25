import type { NodeTypes } from '@xyflow/react';
import { ManualTriggerNode } from './ManualTriggerNode';
import { AiAnalyzeNode } from './AiAnalyzeNode';
import { ConditionNode } from './ConditionNode';
import { SaveResultNode } from './SaveResultNode';
import { HttpRequestNode } from './HttpRequestNode';
import { DelayNode } from './DelayNode';
import { SetVariableNode } from './SetVariableNode';

/**
 * Registry of custom node types for React Flow.
 * Keys must match the NodeType values from the domain model.
 */
export const nodeTypes: NodeTypes = {
  manual_trigger: ManualTriggerNode,
  ai_analyze: AiAnalyzeNode,
  condition: ConditionNode,
  save_result: SaveResultNode,
  http_request: HttpRequestNode,
  delay: DelayNode,
  set_variable: SetVariableNode,
};

export { ManualTriggerNode, AiAnalyzeNode, ConditionNode, SaveResultNode, HttpRequestNode, DelayNode, SetVariableNode };
