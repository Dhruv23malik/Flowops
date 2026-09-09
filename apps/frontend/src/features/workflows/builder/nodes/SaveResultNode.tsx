import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../types';

export function SaveResultNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData;
  const config = nodeData.config as { resultKey?: string };
  const resultKey = config.resultKey || 'result';

  return (
    <div className={`flow-node flow-node--save${selected ? ' flow-node--selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="flow-handle flow-handle--target"
        id="target"
      />
      <div className="flow-node__header">
        <span className="flow-node__icon flow-node__icon--save">↓</span>
        <span className="flow-node__title">Save Result</span>
      </div>
      <div className="flow-node__body">
        <span className="flow-node__description">{resultKey}</span>
      </div>
    </div>
  );
}

SaveResultNode.displayName = 'SaveResultNode';
