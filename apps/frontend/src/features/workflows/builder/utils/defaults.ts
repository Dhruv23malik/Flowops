import type { NodeType } from '../../../../services/workflow.api';

/**
 * Generate a unique node ID.
 */
export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a unique edge ID from source and target.
 */
export function generateEdgeId(source: string, target: string, sourceHandle?: string): string {
  const handleSuffix = sourceHandle ? `_${sourceHandle}` : '';
  return `edge_${source}_${target}${handleSuffix}`;
}

/**
 * Default configuration for each node type.
 */
export function getDefaultConfig(type: NodeType): Record<string, unknown> {
  switch (type) {
    case 'manual_trigger':
      return {};
    case 'ai_analyze':
      return {
        prompt: '',
        outputKey: 'result',
      };
    case 'condition':
      return {
        field: '',
        operator: '==',
        value: '',
      };
    case 'save_result':
      return {
        resultKey: 'result',
      };
    default:
      return {};
  }
}

/**
 * Get a sensible default position for a new node,
 * offset from the last added node or centered.
 */
export function getDefaultPosition(existingNodeCount: number): { x: number; y: number } {
  const baseX = 250;
  const baseY = 80;
  const ySpacing = 150;
  return {
    x: baseX,
    y: baseY + existingNodeCount * ySpacing,
  };
}
