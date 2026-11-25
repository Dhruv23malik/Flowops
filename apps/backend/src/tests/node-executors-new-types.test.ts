import { describe, it, expect } from 'vitest';
import { WorkflowGraphSchema } from '@flowops/schemas';
import { DelayExecutor } from '../services/execution/node-executors/delay.executor';
import { SetVariableExecutor } from '../services/execution/node-executors/set-variable.executor';
import type { ExecutionContext } from '../services/execution/execution.types';

function makeContext(): ExecutionContext {
  return { input: {}, outputs: {}, variables: {} };
}

function makeNode(type: string, config: Record<string, unknown>) {
  return { id: 'n1', type, position: { x: 0, y: 0 }, config } as any;
}

describe('DelayExecutor', () => {
  it('waits the configured seconds and reports them in its output', async () => {
    const executor = new DelayExecutor();
    const started = Date.now();
    const result = await executor.execute(makeNode('delay', { seconds: 1 }), makeContext());
    const elapsed = Date.now() - started;

    expect(result.status).toBe('SUCCESS');
    expect(result.output).toEqual({ delayedSeconds: 1 });
    expect(elapsed).toBeGreaterThanOrEqual(900);
  });

  it('fails on a missing or out-of-range seconds value', async () => {
    const executor = new DelayExecutor();
    for (const config of [{}, { seconds: 0 }, { seconds: 3601 }, { seconds: 1.5 }, { seconds: '5' }]) {
      const result = await executor.execute(makeNode('delay', config), makeContext());
      expect(result.status).toBe('FAILED');
      expect(result.error).toMatch(/seconds/);
    }
  });
});

describe('SetVariableExecutor', () => {
  it('stores the value under the key so later steps can read it from outputs', async () => {
    const executor = new SetVariableExecutor();
    const result = await executor.execute(
      makeNode('set_variable', { outputKey: 'score', value: 70 }),
      makeContext(),
    );
    expect(result.status).toBe('SUCCESS');
    expect(result.output).toEqual({ score: 70 });
  });

  it('accepts string and boolean values too', async () => {
    const executor = new SetVariableExecutor();
    const str = await executor.execute(
      makeNode('set_variable', { outputKey: 'label', value: 'vip' }),
      makeContext(),
    );
    expect(str.output).toEqual({ label: 'vip' });

    const bool = await executor.execute(
      makeNode('set_variable', { outputKey: 'flag', value: true }),
      makeContext(),
    );
    expect(bool.output).toEqual({ flag: true });
  });

  it('fails when outputKey is missing or the value is unset', async () => {
    const executor = new SetVariableExecutor();
    const noKey = await executor.execute(makeNode('set_variable', { value: 1 }), makeContext());
    expect(noKey.status).toBe('FAILED');
    const noValue = await executor.execute(
      makeNode('set_variable', { outputKey: 'x' }),
      makeContext(),
    );
    expect(noValue.status).toBe('FAILED');
  });
});

describe('new node types in the shared schema', () => {
  it('a graph using delay + set_variable passes workflow validation', () => {
    const result = WorkflowGraphSchema.safeParse({
      nodes: [
        { id: 't', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} },
        { id: 'v', type: 'set_variable', position: { x: 0, y: 100 }, config: { outputKey: 'score', value: 70 } },
        { id: 'd', type: 'delay', position: { x: 0, y: 200 }, config: { seconds: 5 } },
        { id: 's', type: 'save_result', position: { x: 0, y: 300 }, config: { resultKey: 'score' } },
      ],
      edges: [
        { id: 'e1', source: 't', target: 'v' },
        { id: 'e2', source: 'v', target: 'd' },
        { id: 'e3', source: 'd', target: 's' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an out-of-range delay and a set_variable without a key', () => {
    const badDelay = WorkflowGraphSchema.safeParse({
      nodes: [
        { id: 't', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} },
        { id: 'd', type: 'delay', position: { x: 0, y: 100 }, config: { seconds: 0 } },
      ],
      edges: [{ id: 'e1', source: 't', target: 'd' }],
    });
    expect(badDelay.success).toBe(false);

    const badVar = WorkflowGraphSchema.safeParse({
      nodes: [
        { id: 't', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} },
        { id: 'v', type: 'set_variable', position: { x: 0, y: 100 }, config: { outputKey: '', value: 1 } },
      ],
      edges: [{ id: 'e1', source: 't', target: 'v' }],
    });
    expect(badVar.success).toBe(false);
  });
});
