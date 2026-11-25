import { describe, it, expect } from 'vitest';
import { buildWorkflowExport, parseWorkflowImport } from './workflow-export';
import type { WorkflowDetail } from '../services/workflow.api';

const DETAIL: WorkflowDetail = {
  id: 'wf1',
  name: 'My Workflow',
  description: 'Does things',
  status: 'DRAFT',
  createdAt: '2026-11-25T10:00:00.000Z',
  updatedAt: '2026-11-25T10:00:00.000Z',
  nodes: [
    { id: 't', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} },
    { id: 'v', type: 'set_variable', position: { x: 0, y: 100 }, config: { outputKey: 'score', value: 70 } },
    { id: 'd', type: 'delay', position: { x: 0, y: 200 }, config: { seconds: 5 } },
  ],
  edges: [
    { id: 'e1', source: 't', target: 'v' },
    { id: 'e2', source: 'v', target: 'd' },
  ],
};

describe('workflow export / import round-trip', () => {
  it('builds an export that parses back to the same workflow', () => {
    const exported = buildWorkflowExport(DETAIL);
    expect(exported.flowopsVersion).toBe(2);
    expect(exported.name).toBe('My Workflow');

    const parsed = parseWorkflowImport(JSON.stringify(exported));
    expect(parsed.name).toBe('My Workflow');
    expect(parsed.description).toBe('Does things');
    expect(parsed.nodes).toEqual(DETAIL.nodes);
    expect(parsed.edges).toEqual(DETAIL.edges);
  });

  it('rejects files that are not JSON, have no name, or fail graph validation', () => {
    expect(() => parseWorkflowImport('not json')).toThrow(/not valid JSON/);
    expect(() => parseWorkflowImport(JSON.stringify({ nodes: [], edges: [] }))).toThrow(
      /missing a name/,
    );
    expect(() =>
      parseWorkflowImport(
        JSON.stringify({
          name: 'Bad',
          nodes: [
            { id: 'd', type: 'delay', position: { x: 0, y: 0 }, config: { seconds: 0 } },
          ],
          edges: [],
        }),
      ),
    ).toThrow(/failed validation/);
  });
});
