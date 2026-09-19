import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { createToken } from '../utils/jwt';

const testUserId = 'test-version-user';
const validToken = createToken(testUserId, 'test@version.com');
const wfId = 'wf-versioning';

const validGraph = {
  nodes: [
    { id: 'n1', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} },
    { id: 'n2', type: 'save_result', position: { x: 0, y: 0 }, config: { resultKey: 'out' } },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2' },
  ],
};

// ─── Mock DB ─────────────────────────────────────────────────────────
// We track version-create calls to assert versioning behaviour.
let versionCreateCalls: any[] = [];

const { mockEmit, mockTo } = vi.hoisted(() => {
  const mockEmit = vi.fn();
  return {
    mockEmit,
    mockTo: vi.fn().mockReturnValue({ emit: mockEmit }),
  };
});

vi.mock('../services/socket', () => ({
  getIo: vi.fn().mockReturnValue({
    to: mockTo,
  }),
  initSocket: vi.fn(),
}));

let mockWorkflow: any = null;

vi.mock('../db', () => ({
  default: {
    workflow: {
      findFirst: vi.fn().mockImplementation(async () => mockWorkflow),
    },
    workflowVersion: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        const version = {
          id: `wv-${Date.now()}`,
          workflowId: data.workflowId,
          version: data.version,
          graph: data.graph,
          createdAt: new Date(),
        };
        versionCreateCalls.push(version);
        return version;
      }),
    },
    execution: {
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: 'exec-v',
        ...data,
        createdAt: new Date(),
      })),
      update: vi.fn().mockImplementation(async ({ where, data }) => ({
        id: where.id,
        ...data,
      })),
      findUnique: vi.fn().mockImplementation(async () => ({
        id: 'exec-v',
        status: 'SUCCESS',
        steps: [],
      })),
    },
    executionStep: {
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: `step-${Date.now()}`,
        ...data,
      })),
      update: vi.fn().mockImplementation(async ({ where, data }) => ({
        id: where.id,
        ...data,
      })),
    },
  },
}));

describe('Workflow Versioning (POST /api/workflows/:id/run)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    versionCreateCalls = [];
    mockWorkflow = null;
  });

  it('creates v1 when no versions exist', async () => {
    mockWorkflow = {
      id: wfId,
      userId: testUserId,
      name: 'Version Test',
      ...validGraph,
      versions: [], // no existing versions
    };

    const res = await request(app)
      .post(`/api/workflows/${wfId}/run`)
      .set('Cookie', [`token=${validToken}`]);

    expect(res.status).toBe(200);
    expect(versionCreateCalls.length).toBe(1);
    expect(versionCreateCalls[0].version).toBe(1);
  });

  it('reuses latest version when graph is unchanged', async () => {
    mockWorkflow = {
      id: wfId,
      userId: testUserId,
      name: 'Version Test',
      ...validGraph,
      versions: [{
        id: 'wv-existing',
        version: 1,
        graph: validGraph, // same as current
      }],
    };

    const res = await request(app)
      .post(`/api/workflows/${wfId}/run`)
      .set('Cookie', [`token=${validToken}`]);

    expect(res.status).toBe(200);
    expect(versionCreateCalls.length).toBe(0); // no new version created
  });

  it('creates v2 when graph has changed', async () => {
    const oldGraph = {
      nodes: [
        { id: 'n1', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} },
      ],
      edges: [],
    };

    mockWorkflow = {
      id: wfId,
      userId: testUserId,
      name: 'Version Test',
      ...validGraph, // current graph has 2 nodes
      versions: [{
        id: 'wv-old',
        version: 1,
        graph: oldGraph, // old graph had 1 node
      }],
    };

    const res = await request(app)
      .post(`/api/workflows/${wfId}/run`)
      .set('Cookie', [`token=${validToken}`]);

    expect(res.status).toBe(200);
    expect(versionCreateCalls.length).toBe(1);
    expect(versionCreateCalls[0].version).toBe(2);
  });

  it('returns 400 for invalid graph without creating a version', async () => {
    mockWorkflow = {
      id: wfId,
      userId: testUserId,
      name: 'Bad Graph',
      nodes: [
        { id: 'n1', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} },
        { id: 'n2', type: 'ai_analyze', position: { x: 0, y: 0 }, config: {} }, // missing required prompt
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
      versions: [],
    };

    const res = await request(app)
      .post(`/api/workflows/${wfId}/run`)
      .set('Cookie', [`token=${validToken}`]);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_WORKFLOW');
    expect(versionCreateCalls.length).toBe(0); // no version saved
  });
});
