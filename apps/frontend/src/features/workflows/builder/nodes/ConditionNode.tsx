import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../types';

export function ConditionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData;
  const config = nodeData.config as { field?: string; operator?: string; value?: string | number | boolean };
  const summary =
    config.field && config.operator
      ? `${config.field} ${config.operator} ${config.value ?? ''}`
      : 'Not configured';

  return (
    <div className={`flow-node flow-node--condition${selected ? ' flow-node--selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="flow-handle flow-handle--target"
        id="target"
      />
      <div className="flow-node__header">
        <span className="flow-node__icon flow-node__icon--condition">◇</span>
        <span className="flow-node__title">Condition</span>
      </div>
      <div className="flow-node__body">
        <span className="flow-node__description">{summary}</span>
      </div>
      <div className="flow-node__handles-bottom">
        <Handle
          type="source"
          position={Position.Bottom}
          className="flow-handle flow-handle--source flow-handle--yes"
          id="yes"
          style={{ left: '30%' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="flow-handle flow-handle--source flow-handle--no"
          id="no"
          style={{ left: '70%' }}
        />
      </div>
      <div className="flow-node__branch-labels">
        <span className="flow-node__branch-label flow-node__branch-label--yes">Yes</span>
        <span className="flow-node__branch-label flow-node__branch-label--no">No</span>
      </div>
    </div>
  );
}

ConditionNode.displayName = 'ConditionNode';
