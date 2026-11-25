import type { Execution } from '../services/execution.api';

export interface ExecutionStats {
  /** Executions started this calendar month. */
  runsThisMonth: number;
  /** Failed executions this calendar month. */
  failedThisMonth: number;
  /** Share of completed runs that succeeded this month (0–1), or null when nothing completed yet. */
  successRate: number | null;
  /** Mean duration of completed runs this month in ms, or null when none completed yet. */
  avgDurationMs: number | null;
}

/**
 * Pure computation behind the dashboard stat cards. Kept separate from the
 * page so it can be unit-tested without rendering.
 */
export function computeExecutionStats(executions: Execution[], now = new Date()): ExecutionStats {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const inMonth = executions.filter((e) => {
    const started = e.startedAt ? new Date(e.startedAt).getTime() : new Date(e.createdAt).getTime();
    return started >= monthStart;
  });

  const completed = inMonth.filter((e) => e.status === 'SUCCESS' || e.status === 'FAILED');
  const succeeded = inMonth.filter((e) => e.status === 'SUCCESS').length;

  const durations = completed
    .map((e) =>
      e.startedAt && e.completedAt
        ? new Date(e.completedAt).getTime() - new Date(e.startedAt).getTime()
        : null,
    )
    .filter((d): d is number => d !== null && d >= 0);

  return {
    runsThisMonth: inMonth.length,
    failedThisMonth: inMonth.filter((e) => e.status === 'FAILED').length,
    successRate: completed.length > 0 ? succeeded / completed.length : null,
    avgDurationMs:
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null,
  };
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
