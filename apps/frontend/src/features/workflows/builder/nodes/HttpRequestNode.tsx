import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../types';

export function HttpRequestNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as {
    url?: string;
    method?: string;
  };

  const method = config.method || 'GET';
  const url = config.url || 'No URL configured';

  // Determine method color
  let methodColor = 'text-blue-600 bg-blue-100';
  if (method === 'POST') methodColor = 'text-green-600 bg-green-100';
  else if (method === 'PUT') methodColor = 'text-yellow-600 bg-yellow-100';
  else if (method === 'DELETE') methodColor = 'text-red-600 bg-red-100';

  return (
    <div className={`node-card ${selected ? 'node-card--selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="node-handle" />
      
      <div className="node-card__header">
        <span className="node-card__icon">🌐</span>
        <div className="node-card__title">HTTP Request</div>
      </div>

      <div className="node-card__content" style={{ padding: '0.5rem 1rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${methodColor}`}>
            {method}
          </span>
          <span className="text-xs text-gray-500 truncate" style={{ maxWidth: 150 }} title={url}>
            {url}
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
}
