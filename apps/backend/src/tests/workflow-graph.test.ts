import { describe, it, expect } from 'vitest';
import { validateWorkflowGraph, WorkflowGraphSchema } from '@flowops/schemas';

// ─── Helper: build a minimal valid graph ─────────────────────────

function makeNode(
  id: string,
  type: 'manual_trigger' | 'ai_analyze' | 'condition' | 'save_result',
  config: Record<string, unknown> = {},
  position = { x: 0, y: 0 },
) {
  const defaults: Record<string, Record<string, unknown>> = {
    manual_trigger: {},
    ai_analyze: { prompt: 'Test prompt', outputKey: 'result' },
    condition: { field: 'score', operator: '==', value: 50 },
    save_result: { resultKey: 'result' },
  };
  return { id, type, position, config: { ...defaults[type], ...config } };
}

function makeEdge(source: string, target: string, id?: string) {
  return { id: id ?? `edge_${source}_${target}`, source, target };
}

// ─── Tests ───────────────────────────────────────────────────────

describe('WorkflowGraphSchema / validateWorkflowGraph', () => {
  it('accepts a valid graph with all node types', () => {
    const result = validateWorkflowGraph({
      nodes: [
        makeNode('n1', 'manual_trigger'),
        makeNode('n2', 'ai_analyze'),
        makeNode('n3', 'condition'),
        makeNode('n4', 'save_result'),
      ],
      edges: [
        makeEdge('n1', 'n2'),
        makeEdge('n2', 'n3'),
        makeEdge('n3', 'n4'),
      ],
    });
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts a graph with a single node (manual_trigger)', () => {
    const result = validateWorkflowGraph({
      nodes: [makeNode('n1', 'manual_trigger')],
      edges: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty nodes array', () => {
    const result = WorkflowGraphSchema.safeParse({ nodes: [], edges: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid node type', () => {
    const result = validateWorkflowGraph({
      nodes: [
        { id: 'n1', type: 'invalid_type', position: { x: 0, y: 0 }, config: {} },
      ],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate node IDs', () => {
    const result = validateWorkflowGraph({
      nodes: [
        makeNode('n1', 'manual_trigger'),
        makeNode('n1', 'ai_analyze'), // duplicate ID
      ],
      edges: [],
    });
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('unique'))).toBe(true);
  });

  it('rejects more than one manual_trigger', () => {
    const result = validateWorkflowGraph({
      nodes: [
        makeNode('n1', 'manual_trigger'),
        makeNode('n2', 'manual_trigger'),
      ],
      edges: [],
    });
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('at most one'))).toBe(true);
  });

  it('rejects invalid node config (ai_analyze missing prompt)', () => {
    const result = validateWorkflowGraph({
      nodes: [
        makeNode('n1', 'ai_analyze', { prompt: '' }), // empty prompt
      ],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid node config (condition missing field)', () => {
    const result = validateWorkflowGraph({
      nodes: [
        makeNode('n1', 'condition', { field: '' }),
      ],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid node config (save_result missing resultKey)', () => {
    const result = validateWorkflowGraph({
      nodes: [
        makeNode('n1', 'save_result', { resultKey: '' }),
      ],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects edge referencing missing source node', () => {
    const result = validateWorkflowGraph({
      nodes: [makeNode('n1', 'manual_trigger')],
      edges: [makeEdge('missing', 'n1')],
    });
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('unknown source'))).toBe(true);
  });

  it('rejects edge referencing missing target node', () => {
    const result = validateWorkflowGraph({
      nodes: [makeNode('n1', 'manual_trigger')],
      edges: [makeEdge('n1', 'missing')],
    });
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('unknown target'))).toBe(true);
  });

  it('rejects self-loop edges', () => {
    const result = validateWorkflowGraph({
      nodes: [makeNode('n1', 'manual_trigger')],
      edges: [makeEdge('n1', 'n1')],
    });
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('self-loop'))).toBe(true);
  });

  it('validates node positions are required', () => {
    const result = WorkflowGraphSchema.safeParse({
      nodes: [
        { id: 'n1', type: 'manual_trigger', config: {} },
        // Missing position
      ],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional sourceHandle and targetHandle on edges', () => {
    const result = validateWorkflowGraph({
      nodes: [
        makeNode('n1', 'condition'),
        makeNode('n2', 'save_result'),
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'yes' },
      ],
    });
    expect(result.success).toBe(true);
  });

  // ─── Cycle Detection Tests ──────────────────────────────────────

  it('rejects a 2-node cycle (A→B→A)', () => {
    const result = validateWorkflowGraph({
      nodes: [
        makeNode('a', 'manual_trigger'),
        makeNode('b', 'ai_analyze'),
      ],
      edges: [
        makeEdge('a', 'b'),
        makeEdge('b', 'a'),
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('cycle'))).toBe(true);
  });

  it('rejects a 3-node cycle (A→B→C→A)', () => {
    const result = validateWorkflowGraph({
      nodes: [
        makeNode('a', 'manual_trigger'),
        makeNode('b', 'ai_analyze'),
        makeNode('c', 'save_result'),
      ],
      edges: [
        makeEdge('a', 'b'),
        makeEdge('b', 'c'),
        makeEdge('c', 'a'),
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('cycle'))).toBe(true);
  });

  it('accepts a valid diamond-shaped DAG (A→B, A→C, B→D, C→D)', () => {
    const result = validateWorkflowGraph({
      nodes: [
        makeNode('a', 'manual_trigger'),
        makeNode('b', 'ai_analyze'),
        makeNode('c', 'ai_analyze', { prompt: 'Alt path', outputKey: 'alt' }),
        makeNode('d', 'save_result'),
      ],
      edges: [
        makeEdge('a', 'b'),
        makeEdge('a', 'c'),
        makeEdge('b', 'd'),
        makeEdge('c', 'd'),
      ],
    });
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
