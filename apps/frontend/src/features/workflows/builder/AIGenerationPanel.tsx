import { useState } from 'react';
import { apiGenerateWorkflow, type GeneratedWorkflow } from '../../../services/ai.api';
import { ApiException } from '../../../services/auth.api';

interface AIGenerationPanelProps {
  workflowId?: string;
  isOpen: boolean;
  onClose: () => void;
  onApply: (workflow: GeneratedWorkflow) => void;
}

export function AIGenerationPanel({ workflowId, isOpen, onClose, onApply }: AIGenerationPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GeneratedWorkflow | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || trimmed.length < 10) {
      setError('Please describe your workflow in more detail (at least 10 characters).');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPreview(null);

    try {
      const generated = await apiGenerateWorkflow(trimmed, workflowId);
      setPreview(generated);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('FlowOps couldn\'t generate a valid workflow. Please try again or simplify your request.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (preview) {
      onApply(preview);
    }
  };

  const handleDiscard = () => {
    setPreview(null);
    setPrompt('');
    onClose();
  };

  const handleBack = () => {
    setPreview(null);
  };

  return (
    <div className="ai-modal-overlay">
      <div className="ai-modal">
        <div className="ai-modal__header">
          <h3 className="ai-modal__title">✦ FlowOps Copilot</h3>
          <button className="ai-modal__close" onClick={handleDiscard}>×</button>
        </div>

        <div className="ai-modal__body">
          {preview ? (
            <div className="ai-preview">
              <h4 className="ai-preview__title">AI generated workflow</h4>
              <div className="ai-preview__meta">
                <strong>{preview.name}</strong>
                <p>{preview.description}</p>
              </div>
              <div className="ai-preview__graph">
                {preview.nodes.map((node, i) => (
                  <div key={node.id} className="ai-preview__node-wrapper">
                    <div className="ai-preview__node">
                      <span className="ai-preview__node-type">{node.type.replace('_', ' ')}</span>
                      {node.type === 'ai_analyze' && node.config.outputKey && (
                        <div className="ai-preview__node-detail">→ {String(node.config.outputKey)}</div>
                      )}
                    </div>
                    {i < preview.nodes.length - 1 && (
                      <div className="ai-preview__arrow">↓</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="ai-modal__actions">
                <button className="btn btn-secondary" onClick={handleDiscard}>Discard</button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" onClick={handleBack}>Back to edit</button>
                  <button className="btn btn-primary" onClick={handleApply}>Apply to canvas</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="ai-prompt-form">
              <p className="ai-prompt-form__desc">Describe what you want to automate.</p>
              <textarea
                className="form-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Analyze incoming customer feedback and save the result."
                rows={5}
                disabled={isGenerating}
                style={{ width: '100%', marginBottom: '12px' }}
              />
              
              <div className="ai-prompt-form__examples">
                <p><strong>Try:</strong></p>
                <p>"Analyze support messages and save the sentiment."</p>
              </div>

              {error && (
                <div className="ai-modal__error">
                  {error}
                </div>
              )}

              <div className="ai-modal__actions" style={{ justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleGenerate}
                  disabled={isGenerating || prompt.trim().length === 0}
                >
                  {isGenerating ? '✦ Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
