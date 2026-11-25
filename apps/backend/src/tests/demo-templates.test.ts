import { describe, it, expect, vi } from 'vitest';

// The templates import the real Prisma client via ../db, which needs
// `prisma generate` — mock it like the other tests do, so this file runs
// without a database and without a generated client.
vi.mock('../db', () => ({ default: {} }));

import { WorkflowGraphSchema } from '@flowops/schemas';
import { DEMO_WORKFLOWS } from '../services/demo-templates';

// The demo workflows are the first thing a new visitor sees — if one of
// them fails Zod validation, the seed (and the guest first impression)
// breaks. These tests run without a database.
describe('demo workflow templates', () => {
  it('ships exactly 3 demo workflows', () => {
    expect(DEMO_WORKFLOWS).toHaveLength(3);
    expect(DEMO_WORKFLOWS.map((w) => w.name)).toEqual([
      'Customer Feedback Triage',
      'Slack Notification Workflow',
      'Weekly Report Digest',
    ]);
  });

  it('every demo graph passes the shared Zod workflow validation', () => {
    for (const template of DEMO_WORKFLOWS) {
      const result = WorkflowGraphSchema.safeParse({
        nodes: template.nodes,
        edges: template.edges,
      });
      expect(result.success, `Demo workflow "${template.name}" failed validation`).toBe(true);
    }
  });

  it('every demo workflow starts with exactly one manual trigger', () => {
    for (const template of DEMO_WORKFLOWS) {
      const triggers = template.nodes.filter((n) => n.type === 'manual_trigger');
      expect(triggers).toHaveLength(1);
    }
  });

  it('at least one demo workflow is ACTIVE so the Overview is not all zeros', () => {
    expect(DEMO_WORKFLOWS.some((w) => w.status === 'ACTIVE')).toBe(true);
  });
});
