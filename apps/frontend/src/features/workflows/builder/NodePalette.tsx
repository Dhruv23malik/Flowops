import { NODE_TYPE_INFO } from './types';
import type { NodeType } from '../../../services/workflow.api';

interface NodePaletteProps {
  onAddNode: (type: NodeType) => void;
  hasTrigger: boolean;
}

export function NodePalette({ onAddNode, hasTrigger }: NodePaletteProps) {
  const categories = [
    { label: 'TRIGGER', types: NODE_TYPE_INFO.filter((n) => n.category === 'TRIGGER') },
    { label: 'AI', types: NODE_TYPE_INFO.filter((n) => n.category === 'AI') },
    { label: 'LOGIC', types: NODE_TYPE_INFO.filter((n) => n.category === 'LOGIC') },
    { label: 'OUTPUT', types: NODE_TYPE_INFO.filter((n) => n.category === 'OUTPUT') },
  ];

  const handleDragStart = (e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('application/flowops-node-type', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="node-palette" id="node-palette">
      <div className="node-palette__header">
        <h3 className="node-palette__title">Nodes</h3>
      </div>
      <div className="node-palette__list">
        {categories.map((cat) => (
          <div key={cat.label} className="node-palette__category">
            <span className="node-palette__category-label">{cat.label}</span>
            {cat.types.map((info) => {
              const isDisabled = info.type === 'manual_trigger' && hasTrigger;
              return (
                <button
                  key={info.type}
                  className={`node-palette__item${isDisabled ? ' node-palette__item--disabled' : ''}`}
                  onClick={() => !isDisabled && onAddNode(info.type)}
                  onDragStart={(e) => !isDisabled && handleDragStart(e, info.type)}
                  draggable={!isDisabled}
                  disabled={isDisabled}
                  title={isDisabled ? 'Only one trigger allowed per workflow' : `Add ${info.label}`}
                  id={`palette-${info.type}`}
                >
                  <span className={`node-palette__icon node-palette__icon--${info.type}`}>
                    {info.icon}
                  </span>
                  <div className="node-palette__item-info">
                    <span className="node-palette__item-name">{info.label}</span>
                    <span className="node-palette__item-desc">{info.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
