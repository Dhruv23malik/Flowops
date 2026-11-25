import { describe, it, expect } from 'vitest';
import { validateWorkflowGraph } from './validation';
import type { FlowNode, FlowEdge } from '../types';

function node(id: string, type: string, config: Record<string, unknown> = {}): FlowNode {
  return {
    id,
    type: type as FlowNode['type'],
    position: { x: 0, y: 0 },
    data: { nodeType: type as any, config, label: type },
  };
}

function edge(id: string, source: string, target: string, sourceHandle?: string): FlowEdge {
  return { id, source, target, sourceHandle } as FlowEdge;
}

describe('validateWorkflowGraph', () => {
  it('accepts a valid linear workflow', () => {
    const result = validateWorkflowGraph(
      [
        node('t', 'manual_trigger'),
        node('a', 'ai_analyze', { prompt: 'Summarize this', outputKey: 'result' }),
        node('s', 'save_result', { resultKey: 'result' }),
      ],
      [edge('e1', 't', 'a'), edge('e2', 'a', 's')],
    );
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts delay and set_variable nodes', () => {
    const result = validateWorkflowGraph(
      [
        node('t', 'manual_trigger'),
        node('v', 'set_variable', { outputKey: 'score', value: 70 }),
        node('d', 'delay', { seconds: 5 }),
      ],
      [edge('e1', 't', 'v'), edge('e2', 'v', 'd')],
    );
    expect(result.success).toBe(true);
  });

  it('rejects an empty workflow', () => {
    const result = validateWorkflowGraph([], []);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toMatch(/at least one node/);
  });

  it('rejects duplicate node ids and more than one trigger', () => {
    const dupes = validateWorkflowGraph(
      [node('t', 'manual_trigger'), node('t', 'manual_trigger')],
      [],
    );
    expect(dupes.success).toBe(false);
    expect(dupes.errors.some((e) => e.includes('Duplicate node ID'))).toBe(true);
    expect(dupes.errors.some((e) => e.includes('at most one Manual Trigger'))).toBe(true);
  });

  it('rejects unknown node types', () => {
    const result = validateWorkflowGraph(
      [node('x', 'teleport', {})],
      [],
    );
    expect(result.success).toBe(false);
    expect(result.errors[0]).toMatch(/invalid type "teleport"/);
  });

  it('requires configs: ai prompt, condition field/operator, save key, http url, delay seconds, variable key', () => {
    const cases: Array<[FlowNode, RegExp]> = [
      [node('a', 'ai_analyze', { prompt: '  ' }), /AI Analyze.*Prompt is required/],
      [node('c', 'condition', { field: '', operator: '==' }), /Condition.*Field is required/],
      [node('c', 'condition', { field: 'x' }), /Condition.*Operator is required/],
      [node('s', 'save_result', { resultKey: '' }), /Save Result.*Result key is required/],
      [node('h', 'http_request', { url: '' }), /HTTP Request.*URL is required/],
      [node('d', 'delay', { seconds: 0 }), /Delay.*Seconds must be a whole number/],
      [node('d', 'delay', { seconds: 3601 }), /Delay.*Seconds must be a whole number/],
      [node('d', 'delay', { seconds: 1.5 }), /Delay.*Seconds must be a whole number/],
      [node('v', 'set_variable', { outputKey: ' ' }), /Set Variable.*Output key is required/],
    ];
    for (const [n, pattern] of cases) {
      const result = validateWorkflowGraph([n], []);
      expect(result.success, `expected failure for ${n.data.nodeType}`).toBe(false);
      expect(result.errors.some((e) => pattern.test(e))).toBe(true);
    }
  });

  it('rejects edges to unknown nodes and self-loops', () => {
    const unknown = validateWorkflowGraph(
      [node('t', 'manual_trigger')],
      [edge('e1', 't', 'ghost')],
    );
    expect(unknown.success).toBe(false);
    expect(unknown.errors[0]).toMatch(/unknown target node "ghost"/);

    const loop = validateWorkflowGraph(
      [node('t', 'manual_trigger')],
      [edge('e1', 't', 't')],
    );
    expect(loop.success).toBe(false);
    expect(loop.errors.some((e) => e.includes('Self-loop'))).toBe(true);
  });
});
