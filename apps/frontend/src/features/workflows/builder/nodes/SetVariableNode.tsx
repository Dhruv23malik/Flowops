import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../types';

export function SetVariableNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData;
  const config = nodeData.config as { outputKey?: string; value?: string | number | boolean };
  const outputKey = config.outputKey || 'my_value';
  const value = config.value === undefined || config.value === '' ? '—' : String(config.value);
  const statusClass = nodeData.executionStatus ? ` flow-node--${nodeData.executionStatus.toLowerCase()}` : '';

  return (
    <div className={`node-card${selected ? ' node-card--selected' : ''}${statusClass}`}>
      <Handle type="target" position={Position.Top} className="node-handle" />

      <div className="node-card__header">
        <span className="node-card__icon">✎</span>
        <div className="node-card__title">Set Variable</div>
      </div>

      <div className="node-card__content" style={{ padding: '0.5rem 1rem 1rem' }}>
        <span className="text-xs text-gray-500">
          {outputKey} = {value}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
}

SetVariableNode.displayName = 'SetVariableNode';
