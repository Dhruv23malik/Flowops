import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../types';

export function DelayNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData;
  const config = nodeData.config as { seconds?: number };
  const seconds = typeof config.seconds === 'number' ? config.seconds : 5;
  const statusClass = nodeData.executionStatus ? ` flow-node--${nodeData.executionStatus.toLowerCase()}` : '';

  return (
    <div className={`node-card${selected ? ' node-card--selected' : ''}${statusClass}`}>
      <Handle type="target" position={Position.Top} className="node-handle" />

      <div className="node-card__header">
        <span className="node-card__icon">⏱</span>
        <div className="node-card__title">Delay</div>
      </div>

      <div className="node-card__content" style={{ padding: '0.5rem 1rem 1rem' }}>
        <span className="text-xs text-gray-500">
          Wait {seconds}s
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
}

DelayNode.displayName = 'DelayNode';
