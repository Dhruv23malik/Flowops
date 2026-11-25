import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { interpolateTemplate, resolveContextPath } from '../services/execution/template.utils';
import { ManualTriggerExecutor } from '../services/execution/node-executors/manual-trigger.executor';
import { ConditionExecutor } from '../services/execution/node-executors/condition.executor';
import { HttpRequestExecutor } from '../services/execution/node-executors/http-request.executor';
import { SetVariableExecutor } from '../services/execution/node-executors/set-variable.executor';
import { generateWebhookToken, verifyWebhookToken } from '../utils/webhook';
import { createToken } from '../utils/jwt';
import type { ExecutionContext } from '../services/execution/execution.types';

const mockState = vi.hoisted(() => ({
  workflow: null as any,
  user: null as any,
  updatedUser: null as any,
  executionSteps: [] as any[],
}));

vi.mock('../db', () => ({
  default: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id && mockState.user?.id === where.id) return mockState.user;
        if (where.email && mockState.user?.email === where.email) return mockState.user;
        return null;
      }),
      update: vi.fn(async ({ data }: any) => {
        mockState.updatedUser = { ...mockState.user, ...data, updatedAt: new Date() };
        return mockState.updatedUser;
      }),
    },
    workflow: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return mockState.workflow?.id === where.id ? mockState.workflow : null;
      }),
    },
    workflowVersion: {
      create: vi.fn(async ({ data }: any) => ({
        id: 'wv-1',
        ...data,
        createdAt: new Date(),
      })),
    },
    execution: {
      create: vi.fn(async ({ data }: any) => ({
        id: 'exec-webhook-1',
        ...data,
        createdAt: new Date(),
      })),
      update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      findUnique: vi.fn(async () => ({
        id: 'exec-webhook-1',
        status: 'SUCCESS',
        steps: mockState.executionSteps,
      })),
    },
    executionStep: {
      create: vi.fn(async ({ data }: any) => {
        const step = { id: `step-${mockState.executionSteps.length + 1}`, ...data };
        mockState.executionSteps.push(step);
        return step;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const step = mockState.executionSteps.find((s) => s.id === where.id);
        if (step) Object.assign(step, data);
        return step;
      }),
    },
  },
}));

import app from '../index';

function makeNode(type: string, config: Record<string, unknown>) {
  return { id: 'n1', type, position: { x: 0, y: 0 }, config } as any;
}

describe('Template Interpolation & Context Resolution', () => {
  it('resolves nested dot paths cleanly', () => {
    const obj = { summary: { urgency: 'high', tags: ['billing', '500'] }, count: 3 };
    expect(resolveContextPath('summary.urgency', obj)).toBe('high');
    expect(resolveContextPath('count', obj)).toBe(3);
    expect(resolveContextPath('missing.field', obj)).toBeUndefined();
  });

  it('interpolates strings, numbers, and JSON objects in templates', () => {
    const outputs = {
      input: { customer: 'Acme', feedback: 'Broken checkout' },
      summary: { urgency: 'high' },
    };
    const result = interpolateTemplate(
      'Customer {{input.customer}} reported "{{input.feedback}}" (summary: {{summary}})',
      outputs,
    );
    expect(result).toBe('Customer Acme reported "Broken checkout" (summary: {"urgency":"high"})');
  });
});

describe('ManualTriggerExecutor with runtime & sample input', () => {
  it('exposes runtime input and falls back to sampleInput when empty', async () => {
    const exec = new ManualTriggerExecutor();

    const withRuntime = await exec.execute(
      makeNode('manual_trigger', { sampleInput: { feedback: 'sample' } }),
      { input: { feedback: 'live' }, outputs: {}, variables: {} },
    );
    expect(withRuntime.output?.feedback).toBe('live');
    expect(withRuntime.output?.input).toEqual({ feedback: 'live' });

    const withFallback = await exec.execute(
      makeNode('manual_trigger', { sampleInput: { feedback: 'sample' } }),
      { input: {}, outputs: {}, variables: {} },
    );
    expect(withFallback.output?.feedback).toBe('sample');
    expect(withFallback.output?.input).toEqual({ feedback: 'sample' });
  });
});

describe('ConditionExecutor contains / not_contains', () => {
  it('evaluates case-insensitive substring and array checks', async () => {
    const exec = new ConditionExecutor();
    const ctx: ExecutionContext = {
      input: {},
      outputs: { message: 'URGENT: Payment gateway timeout', tags: ['Billing', 'Critical'] },
      variables: {},
    };

    const yes = await exec.execute(
      makeNode('condition', { field: 'message', operator: 'contains', value: 'urgent' }),
      ctx,
    );
    expect(yes.branch).toBe('yes');

    const arrayMatch = await exec.execute(
      makeNode('condition', { field: 'tags', operator: 'contains', value: 'critical' }),
      ctx,
    );
    expect(arrayMatch.branch).toBe('yes');

    const notContains = await exec.execute(
      makeNode('condition', { field: 'message', operator: 'not_contains', value: 'resolved' }),
      ctx,
    );
    expect(notContains.branch).toBe('yes');
  });
});

describe('HttpRequestExecutor SSRF + variable interpolation', () => {
  it('blocks internal URLs even when smuggled via template variables', async () => {
    const exec = new HttpRequestExecutor();
    const ctx: ExecutionContext = {
      input: {},
      outputs: { targetHost: '127.0.0.1:8080' },
      variables: {},
    };

    const res = await exec.execute(
      makeNode('http_request', { url: 'http://{{targetHost}}/secret', method: 'GET' }),
      ctx,
    );
    expect(res.status).toBe('FAILED');
    expect(res.error).toMatch(/internal or private/i);
  });
});

describe('SetVariableExecutor template interpolation', () => {
  it('interpolates string values from earlier steps', async () => {
    const exec = new SetVariableExecutor();
    const res = await exec.execute(
      makeNode('set_variable', { outputKey: 'greeting', value: 'Hello {{input.name}}!' }),
      { input: {}, outputs: { input: { name: 'Dhruv' } }, variables: {} },
    );
    expect(res.status).toBe('SUCCESS');
    expect(res.output).toEqual({ greeting: 'Hello Dhruv!' });
  });
});

describe('Webhook token HMAC helpers & endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.executionSteps = [];
    mockState.workflow = {
      id: 'wf-hook-1',
      userId: 'user-hook-1',
      status: 'ACTIVE',
      nodes: [
        { id: 't1', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} },
        { id: 'v1', type: 'set_variable', position: { x: 100, y: 0 }, config: { outputKey: 'msg', value: 'Hi {{input.who}}' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'v1' }],
      versions: [],
    };
  });

  it('verifies valid tokens and rejects tampered ones', () => {
    const token = generateWebhookToken('wf-123', 'user-456');
    expect(verifyWebhookToken('wf-123', 'user-456', token)).toBe(true);
    expect(verifyWebhookToken('wf-123', 'user-999', token)).toBe(false);
    expect(verifyWebhookToken('wf-123', 'user-456', 'wrong-token')).toBe(false);
    expect(verifyWebhookToken('wf-123', 'user-456', undefined)).toBe(false);
  });

  it('rejects webhook calls with missing/invalid token', async () => {
    const res = await request(app)
      .post('/api/webhooks/wf-hook-1')
      .send({ who: 'world' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_WEBHOOK_TOKEN');
  });

  it('rejects webhook calls when workflow is not ACTIVE', async () => {
    mockState.workflow.status = 'DRAFT';
    const token = generateWebhookToken('wf-hook-1', 'user-hook-1');

    const res = await request(app)
      .post('/api/webhooks/wf-hook-1')
      .set('x-flowops-webhook-token', token)
      .send({ who: 'world' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('WORKFLOW_NOT_ACTIVE');
  });

  it('executes ACTIVE workflow with webhook JSON body as input', async () => {
    const token = generateWebhookToken('wf-hook-1', 'user-hook-1');

    const res = await request(app)
      .post('/api/webhooks/wf-hook-1')
      .set('x-flowops-webhook-token', token)
      .send({ who: 'FlowOps' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.execution.status).toBe('SUCCESS');
    expect(mockState.executionSteps[1].output).toEqual({ msg: 'Hi FlowOps' });
  });
});

describe('POST /api/auth/upgrade-guest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.user = {
      id: 'guest-user-1',
      name: 'Guest User',
      email: 'guest_abc123@flowops.local',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  it('upgrades a guest account in-place preserving user ID', async () => {
    const token = createToken('guest-user-1', 'guest_abc123@flowops.local');
    const res = await request(app)
      .post('/api/auth/upgrade-guest')
      .set('Cookie', [`token=${token}`])
      .send({ name: 'Dhruv', email: 'dhruv@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe('guest-user-1');
    expect(res.body.data.user.email).toBe('dhruv@example.com');
    expect(res.body.data.user.isGuest).toBe(false);
  });
});
