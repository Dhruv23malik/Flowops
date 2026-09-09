import type { NodeTypes } from '@xyflow/react';
import { ManualTriggerNode } from './ManualTriggerNode';
import { AiAnalyzeNode } from './AiAnalyzeNode';
import { ConditionNode } from './ConditionNode';
import { SaveResultNode } from './SaveResultNode';

/**
 * Registry of custom node types for React Flow.
 * Keys must match the NodeType values from the domain model.
 */
export const nodeTypes: NodeTypes = {
  manual_trigger: ManualTriggerNode,
  ai_analyze: AiAnalyzeNode,
  condition: ConditionNode,
  save_result: SaveResultNode,
};

export { ManualTriggerNode, AiAnalyzeNode, ConditionNode, SaveResultNode };
