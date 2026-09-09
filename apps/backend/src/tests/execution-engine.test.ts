import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowExecutor } from '../services/execution/workflow-executor';
import { WorkflowGraph } from '@flowops/schemas';

// ─── Mock DB ────────────────────────────────────────────────────────
vi.mock('../db', () => ({
  default: {
    execution: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        return {
          id: 'exec-mock',
          ...data,
          createdAt: new Date(),
        };
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        return { id: where.id, ...data };
      }),
      findUnique: vi.fn().mockImplementation(async () => {
        // Just return a dummy wrapper, the executor logic already verified everything in steps
        return {
          id: 'exec-mock',
          status: 'SUCCESS', // default mock
          steps: [] // we don't rely on findUnique output for our actual asserts, we intercept updates instead
        };
      }),
    },
    executionStep: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        return { id: `step-${Date.now()}`, ...data };
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        return { id: where.id, ...data };
      }),
    }
  }
}));

const mockLlmClient = {
  generateText: vi.fn().mockResolvedValue('{"sentiment": "positive"}'),
};

describe('WorkflowExecutor', () => {
  let executor: WorkflowExecutor;
  let dbMock: any;

  beforeEach(async () => {
    executor = new WorkflowExecutor(mockLlmClient);
    vi.clearAllMocks();
    dbMock = (await import('../db')).default;
    
    // We override findUnique locally to return the accumulated steps and status
    // so we can assert on the returned Execution object properly.
    let currentStatus = 'RUNNING';
    const steps: any[] = [];
    
    dbMock.execution.update.mockImplementation(async ({ data }: any) => {
      if (data.status) currentStatus = data.status;
      return { id: 'exec-mock', ...data };
    });
    
    dbMock.executionStep.create.mockImplementation(async ({ data }: any) => {
      const step = { id: `step-${steps.length}`, ...data };
      steps.push(step);
      return step;
    });

    dbMock.executionStep.update.mockImplementation(async ({ where, data }: any) => {
      const step = steps.find(s => s.id === where.id);
      if (step) Object.assign(step, data);
      return step;
    });

    dbMock.execution.findUnique.mockImplementation(async () => {
      return {
        id: 'exec-mock',
        status: currentStatus,
        steps: [...steps]
      };
    });
  });

  const runMockGraph = async (graph: WorkflowGraph) => {
    return executor.run('wf-1', 'wv-1', graph);
  };

  it('executes a linear workflow successfully', async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: '1', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} },
        { id: '2', type: 'save_result', position: { x: 0, y: 0 }, config: { resultKey: 'test' } }
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' }
      ]
    };

    const execution = await runMockGraph(graph);
    expect(execution?.status).toBe('SUCCESS');
    expect(execution?.steps.length).toBe(2);
    expect(execution?.steps[0].nodeType).toBe('manual_trigger');
    expect(execution?.steps[1].nodeType).toBe('save_result');
  });

  it('stops execution on node failure', async () => {
    mockLlmClient.generateText.mockRejectedValueOnce(new Error('AI Failed'));
    
    const graph: WorkflowGraph = {
      nodes: [
        { id: '1', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} },
        { id: 'fail_node', type: 'ai_analyze', position: { x: 0, y: 0 }, config: { prompt: 'valid prompt to pass validation' } },
        { id: '3', type: 'save_result', position: { x: 0, y: 0 }, config: { resultKey: 'test' } }
      ],
      edges: [
        { id: 'e1', source: '1', target: 'fail_node' },
        { id: 'e2', source: 'fail_node', target: '3' }
      ]
    };

    const execution = await runMockGraph(graph);
    expect(execution?.status).toBe('FAILED');
    expect(execution?.steps.length).toBe(2); // trigger + failed AI node
    expect(execution?.steps[1].status).toBe('FAILED');
  });

  it('follows the TRUE branch of a condition', async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: '1', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} },
        { id: '2', type: 'save_result', position: { x: 0, y: 0 }, config: { resultKey: 'score' } },
        { id: 'cond', type: 'condition', position: { x: 0, y: 0 }, config: { field: 'score', operator: '!=', value: '100' } }, // undefined != 100 -> TRUE
        { id: 'yes_node', type: 'save_result', position: { x: 0, y: 0 }, config: { resultKey: 'yes' } },
        { id: 'no_node', type: 'save_result', position: { x: 0, y: 0 }, config: { resultKey: 'no' } }
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: 'cond' },
        { id: 'e_yes', source: 'cond', target: 'yes_node', sourceHandle: 'yes' },
        { id: 'e_no', source: 'cond', target: 'no_node', sourceHandle: 'no' }
      ]
    };

    const execution = await runMockGraph(graph);
    expect(execution?.status).toBe('SUCCESS');
    
    const executedNodeIds = execution?.steps.map((s: any) => s.nodeId);
    expect(executedNodeIds).toContain('yes_node');
    expect(executedNodeIds).not.toContain('no_node');
  });
});
