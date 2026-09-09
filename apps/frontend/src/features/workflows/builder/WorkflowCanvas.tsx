import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodes';
import type { FlowNode, FlowEdge, FlowNodeData } from './types';
import type { NodeType } from '../../services/workflow.api';
import { generateNodeId, generateEdgeId, getDefaultConfig } from './utils/defaults';
import { getNodeTypeInfo } from './types';

interface WorkflowCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeClick: (nodeId: string) => void;
  onPaneClick: () => void;
  onAddNode: (type: NodeType, position?: { x: number; y: number }) => void;
  hasTrigger: boolean;
}

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onAddNode,
  hasTrigger,
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const handleConnect = useCallback(
    (connection: Connection) => {
      // Prevent self-loops
      if (connection.source === connection.target) return;
      onConnect(connection);
    },
    [onConnect],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      onNodeClick(node.id);
    },
    [onNodeClick],
  );

  // Drag-and-drop from palette
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/flowops-node-type') as NodeType;
      if (!type) return;

      // Don't allow multiple triggers
      if (type === 'manual_trigger' && hasTrigger) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      onAddNode(type, position);
    },
    [screenToFlowPosition, onAddNode, hasTrigger],
  );

  // Empty state
  if (nodes.length === 0) {
    return (
      <div className="canvas-wrapper" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={[]}
          edges={[]}
          nodeTypes={nodeTypes}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          fitView
          className="workflow-canvas"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.05)" />
          <Controls
            showInteractive={false}
            className="flow-controls"
          />
        </ReactFlow>
        <div className="canvas-empty" id="canvas-empty-state">
          <div className="canvas-empty__icon">🔧</div>
          <h3 className="canvas-empty__title">Your workflow is empty</h3>
          <p className="canvas-empty__text">Add your first node from the left panel.</p>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onAddNode('manual_trigger')}
            id="add-first-trigger-btn"
          >
            + Add Manual Trigger
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-wrapper" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        fitView
        deleteKeyCode={['Delete', 'Backspace']}
        className="workflow-canvas"
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: 'rgba(124, 58, 237, 0.6)', strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.05)" />
        <Controls
          showInteractive={false}
          className="flow-controls"
        />
      </ReactFlow>
    </div>
  );
}
