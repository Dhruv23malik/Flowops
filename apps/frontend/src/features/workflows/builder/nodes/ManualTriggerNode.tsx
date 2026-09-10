import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../types';

export function ManualTriggerNode({ selected, data }: NodeProps) {
  const statusClass = (data as FlowNodeData).executionStatus ? ` flow-node--${(data as FlowNodeData).executionStatus!.toLowerCase()}` : '';
  return (
    <div className={`flow-node flow-node--trigger${selected ? ' flow-node--selected' : ''}${statusClass}`}>
      <div className="flow-node__header">
        <span className="flow-node__icon flow-node__icon--trigger">◉</span>
        <span className="flow-node__title">Manual Trigger</span>
      </div>
      <div className="flow-node__body">
        <span className="flow-node__description">Starts workflow</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="flow-handle flow-handle--source"
        id="source"
      />
    </div>
  );
}

ManualTriggerNode.displayName = 'ManualTriggerNode';
