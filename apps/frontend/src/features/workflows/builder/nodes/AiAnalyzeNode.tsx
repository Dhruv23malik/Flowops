import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../types';

export function AiAnalyzeNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData;
  const config = nodeData.config as { prompt?: string; outputKey?: string };
  const promptPreview = config.prompt
    ? config.prompt.length > 40
      ? config.prompt.substring(0, 40) + '…'
      : config.prompt
    : 'No prompt set';
  const outputKey = config.outputKey || 'result';

  return (
    <div className={`flow-node flow-node--ai${selected ? ' flow-node--selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="flow-handle flow-handle--target"
        id="target"
      />
      <div className="flow-node__header">
        <span className="flow-node__icon flow-node__icon--ai">✦</span>
        <span className="flow-node__title">AI Analyze</span>
      </div>
      <div className="flow-node__body">
        <span className="flow-node__description">{promptPreview}</span>
        {config.prompt && (
          <span className="flow-node__meta">→ {outputKey}</span>
        )}
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

AiAnalyzeNode.displayName = 'AiAnalyzeNode';
