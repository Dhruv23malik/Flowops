import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { createToken } from '../utils/jwt';

const testUserId = 'test-exec-user-1';
const validToken = createToken(testUserId, 'test@exec.com');
const testWorkflowId = 'wf-1';
const testVersionId = 'wv-1';

// ─── Mock Prisma ─────────────────────────────────────────────────────
vi.mock('../db', () => ({
  default: {
    workflow: {
      findFirst: vi.fn().mockImplementation(async ({ where }) => {
        if (where.id === testWorkflowId && where.userId === testUserId) {
          return {
            id: testWorkflowId,
            userId: testUserId,
            name: 'Exec Test WF',
            nodes: [
              { id: '1', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} },
              { id: '2', type: 'save_result', position: { x: 0, y: 0 }, config: { resultKey: 'input' } }
            ],
            edges: [
              { id: 'e1', source: '1', target: '2' }
            ],
            versions: [
              {
                id: testVersionId,
                version: 1,
                graph: {
                  nodes: [
                    { id: '1', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} },
                    { id: '2', type: 'save_result', position: { x: 0, y: 0 }, config: { resultKey: 'input' } }
                  ],
                  edges: [
                    { id: 'e1', source: '1', target: '2' }
                  ]
                }
              }
            ]
          };
        }
        return null;
      }),
    },
    execution: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        return {
          id: 'exec-1',
          workflowId: data.workflowId,
          workflowVersionId: data.workflowVersionId,
          status: data.status,
          startedAt: data.startedAt,
          createdAt: new Date(),
        };
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        return {
          id: where.id,
          ...data,
        };
      }),
      findUnique: vi.fn().mockImplementation(async () => {
        return {
          id: 'exec-1',
          status: 'SUCCESS',
          steps: [
            { id: 'step-1', nodeType: 'manual_trigger', status: 'SUCCESS' },
            { id: 'step-2', nodeType: 'save_result', status: 'SUCCESS' },
          ]
        };
      }),
      findFirst: vi.fn().mockImplementation(async () => {
        return {
          id: 'exec-1',
          status: 'SUCCESS',
          steps: []
        };
      }),
      findMany: vi.fn().mockImplementation(async () => {
        return [
          {
            id: 'exec-1',
            workflowId: testWorkflowId,
            status: 'SUCCESS',
            createdAt: new Date(),
          }
        ];
      })
    },
    executionStep: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        return {
          id: `step-${Date.now()}`,
          ...data,
        };
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        return {
          id: where.id,
          ...data,
        };
      }),
    }
  }
}));

describe('Execution API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/workflows/:id/run', () => {
    it('requires auth', async () => {
      const res = await request(app).post(`/api/workflows/${testWorkflowId}/run`);
      expect(res.status).toBe(401);
    });

    it('returns 404 for unknown workflow', async () => {
      const res = await request(app)
        .post('/api/workflows/unknown-id/run')
        .set('Cookie', [`token=${validToken}`]);
      expect(res.status).toBe(404);
    });

    it('successfully executes a valid workflow', async () => {
      const res = await request(app)
        .post(`/api/workflows/${testWorkflowId}/run`)
        .set('Cookie', [`token=${validToken}`]);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.execution.status).toBe('SUCCESS');
      expect(res.body.data.execution.steps.length).toBe(2);
    });
  });

  describe('GET /api/executions', () => {
    it('lists user executions', async () => {
      const res = await request(app)
        .get('/api/executions')
        .set('Cookie', [`token=${validToken}`]);
      
      expect(res.status).toBe(200);
      expect(res.body.data.executions.length).toBeGreaterThan(0);
      expect(res.body.data.executions[0].workflowId).toBe(testWorkflowId);
    });
  });
});
