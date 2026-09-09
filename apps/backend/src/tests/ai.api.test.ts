import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { generateToken } from '../auth';

// ─── Mock DB ────────────────────────────────────────────────────────
vi.mock('../db', () => ({
  default: {
    llmGenerationLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

// ─── Mock WorkflowGenerator ─────────────────────────────────────────
vi.mock('../services/workflow-generator', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    WorkflowGenerator: vi.fn().mockImplementation(() => ({
      generate: vi.fn().mockImplementation(async (prompt: string) => {
        if (prompt === 'fail-generate') {
          return {
            success: false,
            error: 'Failed to generate',
            attempts: 3,
          };
        }
        
        return {
          success: true,
          workflow: {
            name: "Generated Name",
            description: "Generated Description",
            nodes: [{ id: 'n1', type: 'manual_trigger', position: { x: 0, y: 0 }, config: {} }],
            edges: [],
          },
          attempts: 1,
        };
      }),
    })),
  };
});

describe('POST /api/ai/generate-workflow', () => {
  const validToken = generateToken('user-1', 'test@test.com');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    const res = await request(app)
      .post('/api/ai/generate-workflow')
      .send({ prompt: 'Analyze some data' });

    expect(res.status).toBe(401);
  });

  it('should validate request prompt length', async () => {
    const res = await request(app)
      .post('/api/ai/generate-workflow')
      .set('Cookie', [`token=${validToken}`])
      .send({ prompt: 'short' }); // under 10 chars

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return successfully generated workflow', async () => {
    const res = await request(app)
      .post('/api/ai/generate-workflow')
      .set('Cookie', [`token=${validToken}`])
      .send({ prompt: 'Analyze customer data and save result' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workflow.name).toBe('Generated Name');
    expect(res.body.data.workflow.nodes).toHaveLength(1);
  });

  it('should handle generation failures gracefully', async () => {
    const res = await request(app)
      .post('/api/ai/generate-workflow')
      .set('Cookie', [`token=${validToken}`])
      .send({ prompt: 'fail-generate' }); // mock triggers failure

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AI_WORKFLOW_GENERATION_FAILED');
  });
});
