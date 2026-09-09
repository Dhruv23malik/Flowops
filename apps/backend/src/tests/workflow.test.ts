import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../index';

// ─── Mock Data Stores ───────────────────────────────────────────────
const mockUsers = new Map<string, {
  id: string; name: string | null; email: string; passwordHash: string;
  createdAt: Date; updatedAt: Date;
}>();

const mockWorkflows = new Map<string, {
  id: string; name: string; description: string | null; status: string;
  nodes: unknown; edges: unknown; userId: string; createdAt: Date; updatedAt: Date;
}>();

// ─── Mock Prisma ─────────────────────────────────────────────────────
vi.mock('../db', () => ({
  default: {
    user: {
      findUnique: vi.fn(({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) {
          for (const u of mockUsers.values()) {
            if (u.email === where.email) return Promise.resolve(u);
          }
          return Promise.resolve(null);
        }
        if (where.id) return Promise.resolve(mockUsers.get(where.id) ?? null);
        return Promise.resolve(null);
      }),
      create: vi.fn(({ data }: { data: { name?: string; email: string; passwordHash: string } }) => {
        const user = {
          id: `user-${mockUsers.size + 1}`,
          name: data.name ?? null,
          email: data.email,
          passwordHash: data.passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsers.set(user.id, user);
        return Promise.resolve(user);
      }),
    },
    workflow: {
      findMany: vi.fn(({ where }: { where: { userId: string } }) => {
        const results = [...mockWorkflows.values()]
          .filter((w) => w.userId === where.userId)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .map(({ nodes: _n, edges: _e, userId: _u, ...w }) => w);
        return Promise.resolve(results);
      }),
      findFirst: vi.fn(({ where }: { where: { id: string; userId: string } }) => {
        const w = mockWorkflows.get(where.id);
        if (!w || w.userId !== where.userId) return Promise.resolve(null);
        return Promise.resolve(w);
      }),
      create: vi.fn(({ data }: { data: { name: string; description?: string; status?: string; nodes?: unknown; edges?: unknown; userId: string } }) => {
        const w = {
          id: `wf-${mockWorkflows.size + 1}`,
          name: data.name,
          description: data.description ?? null,
          status: data.status ?? 'DRAFT',
          nodes: data.nodes ?? [],
          edges: data.edges ?? [],
          userId: data.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockWorkflows.set(w.id, w);
        return Promise.resolve(w);
      }),
      update: vi.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const w = mockWorkflows.get(where.id);
        if (!w) return Promise.resolve(null);
        const updated = { ...w, ...data, updatedAt: new Date() };
        mockWorkflows.set(where.id, updated);
        return Promise.resolve(updated);
      }),
      delete: vi.fn(({ where }: { where: { id: string } }) => {
        const w = mockWorkflows.get(where.id);
        mockWorkflows.delete(where.id);
        return Promise.resolve(w);
      }),
    },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────
async function registerAndGetAgent(email: string, password = 'password123') {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'Test', email, password });
  return agent;
}

beforeEach(() => {
  mockUsers.clear();
  mockWorkflows.clear();
});

afterAll(() => {
  vi.restoreAllMocks();
});

// ─── Create Workflow ──────────────────────────────────────────────────
describe('POST /api/workflows', () => {
  it('should create a workflow for authenticated user', async () => {
    const agent = await registerAndGetAgent('create@example.com');

    const res = await agent.post('/api/workflows').send({
      name: 'My Workflow',
      description: 'A test workflow',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('My Workflow');
    expect(res.body.data.status).toBe('DRAFT');
    // userId must not appear in response
    expect(res.body.data.userId).toBeUndefined();
  });

  it('should reject creation without auth', async () => {
    const res = await request(app).post('/api/workflows').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('should reject missing name', async () => {
    const agent = await registerAndGetAgent('noname@example.com');
    const res = await agent.post('/api/workflows').send({ description: 'No name' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ─── List Workflows ───────────────────────────────────────────────────
describe('GET /api/workflows', () => {
  it('should return only authenticated user workflows', async () => {
    const agentA = await registerAndGetAgent('listA@example.com');
    const agentB = await registerAndGetAgent('listB@example.com');

    await agentA.post('/api/workflows').send({ name: 'A Workflow' });
    await agentB.post('/api/workflows').send({ name: 'B Workflow' });

    const resA = await agentA.get('/api/workflows');
    expect(resA.status).toBe(200);
    expect(resA.body.data).toHaveLength(1);
    expect(resA.body.data[0].name).toBe('A Workflow');

    const resB = await agentB.get('/api/workflows');
    expect(resB.body.data).toHaveLength(1);
    expect(resB.body.data[0].name).toBe('B Workflow');
  });
});

// ─── Get Single Workflow ──────────────────────────────────────────────
describe('GET /api/workflows/:id', () => {
  it('should return own workflow with nodes and edges', async () => {
    const agent = await registerAndGetAgent('getone@example.com');
    const createRes = await agent.post('/api/workflows').send({ name: 'Detail Workflow' });
    const id = createRes.body.data.id;

    const res = await agent.get(`/api/workflows/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.nodes).toBeDefined();
    expect(res.body.data.edges).toBeDefined();
  });

  it('should return 404 for non-existent workflow', async () => {
    const agent = await registerAndGetAgent('getmissing@example.com');
    const res = await agent.get('/api/workflows/does-not-exist');
    expect(res.status).toBe(404);
  });
});

// ─── Update Workflow ──────────────────────────────────────────────────
describe('PUT /api/workflows/:id', () => {
  it('should update own workflow fields', async () => {
    const agent = await registerAndGetAgent('update@example.com');
    const createRes = await agent.post('/api/workflows').send({ name: 'Original' });
    const id = createRes.body.data.id;

    const res = await agent.put(`/api/workflows/${id}`).send({
      name: 'Updated Name',
      status: 'ACTIVE',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
    expect(res.body.data.status).toBe('ACTIVE');
  });
});

// ─── Delete Workflow ──────────────────────────────────────────────────
describe('DELETE /api/workflows/:id', () => {
  it('should delete own workflow', async () => {
    const agent = await registerAndGetAgent('delete@example.com');
    const createRes = await agent.post('/api/workflows').send({ name: 'To Delete' });
    const id = createRes.body.data.id;

    const delRes = await agent.delete(`/api/workflows/${id}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const getRes = await agent.get(`/api/workflows/${id}`);
    expect(getRes.status).toBe(404);
  });
});

// ─── Cross-User Authorization ─────────────────────────────────────────
describe('Cross-user workflow isolation', () => {
  it('User A cannot access User B workflow', async () => {
    const agentA = await registerAndGetAgent('isolationA@example.com');
    const agentB = await registerAndGetAgent('isolationB@example.com');

    const createRes = await agentB.post('/api/workflows').send({ name: "B's Private Workflow" });
    const bWorkflowId = createRes.body.data.id;

    // User A tries to access User B's workflow
    const res = await agentA.get(`/api/workflows/${bWorkflowId}`);
    expect(res.status).toBe(404); // Must not reveal it exists

    // User A tries to delete User B's workflow
    const delRes = await agentA.delete(`/api/workflows/${bWorkflowId}`);
    expect(delRes.status).toBe(404);

    // User A tries to update User B's workflow
    const putRes = await agentA.put(`/api/workflows/${bWorkflowId}`).send({ name: 'Hacked' });
    expect(putRes.status).toBe(404);
  });
});
