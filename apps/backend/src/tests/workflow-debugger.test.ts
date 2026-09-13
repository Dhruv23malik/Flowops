import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowDebugger } from '../services/workflow-debugger';
import db from '../db';
import type { Execution, Workflow, WorkflowVersion } from '@prisma/client';

// Mock DB
vi.mock('../db', () => ({
  default: {
    execution: {
      findUnique: vi.fn(),
    },
  },
}));

describe('WorkflowDebugger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should deny access if execution does not belong to user', async () => {
    const mockDb = db.execution.findUnique as any;
    mockDb.mockResolvedValue({
      id: 'exec1',
      workflow: { userId: 'userA' },
      status: 'FAILED',
    });

    const debuggerService = new WorkflowDebugger();
    const res = await debuggerService.debugExecution('exec1', 'userB');

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Execution not found or access denied/);
  });

  it('should return error if execution is not FAILED', async () => {
    const mockDb = db.execution.findUnique as any;
    mockDb.mockResolvedValue({
      id: 'exec1',
      workflow: { userId: 'userA' },
      status: 'SUCCESS',
    });

    const debuggerService = new WorkflowDebugger();
    const res = await debuggerService.debugExecution('exec1', 'userA');

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Only failed executions/);
  });

  it('should return parsed diagnosis when LLM gives valid response', async () => {
    const mockDb = db.execution.findUnique as any;
    mockDb.mockResolvedValue({
      id: 'exec1',
      workflow: { userId: 'userA', name: 'Test' },
      workflowVersion: { graph: JSON.stringify({ nodes: [], edges: [] }) },
      status: 'FAILED',
      steps: [
        { id: 'step1', nodeId: 'node1', nodeType: 'ai_analyze', status: 'FAILED', error: 'Missing field' }
      ]
    });

    const mockLlmClient = {
      generateText: vi.fn().mockResolvedValue(JSON.stringify({
        diagnosis: "The AI Analyze node received an empty input.",
        probableCause: "Previous node output was not mapped.",
        suggestedFix: {
          type: "update_node_config",
          nodeId: "node1",
          changes: { prompt: "Analyze the message." }
        }
      }))
    };

    const debuggerService = new WorkflowDebugger(mockLlmClient);
    const res = await debuggerService.debugExecution('exec1', 'userA');

    expect(res.success).toBe(true);
    expect(res.diagnosis).toBeDefined();
    expect(res.diagnosis?.suggestedFix.type).toBe('update_node_config');
  });

  it('should retry if first response is invalid', async () => {
    const mockDb = db.execution.findUnique as any;
    mockDb.mockResolvedValue({
      id: 'exec1',
      workflow: { userId: 'userA', name: 'Test' },
      workflowVersion: { graph: JSON.stringify({ nodes: [], edges: [] }) },
      status: 'FAILED',
      steps: [
        { id: 'step1', nodeId: 'node1', nodeType: 'ai_analyze', status: 'FAILED', error: 'Missing field' }
      ]
    });

    const mockLlmClient = {
      generateText: vi.fn()
        .mockResolvedValueOnce('Invalid string') // Attempt 1 fails
        .mockResolvedValueOnce(JSON.stringify({ // Attempt 2 succeeds
          diagnosis: "Valid",
          probableCause: "Valid",
          suggestedFix: { type: "no_safe_fix" }
        }))
    };

    const debuggerService = new WorkflowDebugger(mockLlmClient);
    const res = await debuggerService.debugExecution('exec1', 'userA');

    expect(res.success).toBe(true);
    expect(mockLlmClient.generateText).toHaveBeenCalledTimes(2);
    expect(res.diagnosis?.suggestedFix.type).toBe('no_safe_fix');
  });
});
