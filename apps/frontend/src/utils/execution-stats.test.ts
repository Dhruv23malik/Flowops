import { describe, it, expect } from 'vitest';
import { computeExecutionStats, formatDuration } from './execution-stats';
import type { Execution } from '../services/execution.api';

function execution(overrides: Partial<Execution> = {}): Execution {
  return {
    id: 'ex1',
    workflowId: 'wf1',
    workflowVersionId: 'v1',
    status: 'SUCCESS',
    startedAt: '2026-11-25T10:00:00.000Z',
    completedAt: '2026-11-25T10:00:02.000Z',
    createdAt: '2026-11-25T10:00:00.000Z',
    ...overrides,
  };
}

// "Now" is 25 Nov 2026 — runs in November count, October runs do not.
const NOW = new Date('2026-11-25T12:00:00.000Z');

describe('computeExecutionStats', () => {
  it('returns zeros and nulls for no executions', () => {
    expect(computeExecutionStats([], NOW)).toEqual({
      runsThisMonth: 0,
      failedThisMonth: 0,
      successRate: null,
      avgDurationMs: null,
    });
  });

  it('counts this-month runs, failures, success rate and average duration', () => {
    const stats = computeExecutionStats(
      [
        execution({ id: 'a', status: 'SUCCESS' }),
        execution({
          id: 'b',
          status: 'SUCCESS',
          startedAt: '2026-11-20T09:00:00.000Z',
          completedAt: '2026-11-20T09:00:04.000Z',
        }),
        execution({ id: 'c', status: 'FAILED' }),
        execution({ id: 'd', status: 'RUNNING', completedAt: null }),
        // Last month — must not count.
        execution({
          id: 'e',
          status: 'SUCCESS',
          startedAt: '2026-10-15T09:00:00.000Z',
          completedAt: '2026-10-15T09:00:01.000Z',
          createdAt: '2026-10-15T09:00:00.000Z',
        }),
      ],
      NOW,
    );
    expect(stats.runsThisMonth).toBe(4);
    expect(stats.failedThisMonth).toBe(1);
    expect(stats.successRate).toBeCloseTo(2 / 3);
    expect(stats.avgDurationMs).toBe(2667);
  });

  it('ignores running executions for success rate and duration', () => {
    const stats = computeExecutionStats(
      [execution({ status: 'RUNNING', completedAt: null })],
      NOW,
    );
    expect(stats.runsThisMonth).toBe(1);
    expect(stats.successRate).toBeNull();
    expect(stats.avgDurationMs).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats ms and seconds, and null as an em dash', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(250)).toBe('250ms');
    expect(formatDuration(2500)).toBe('2.5s');
  });
});
