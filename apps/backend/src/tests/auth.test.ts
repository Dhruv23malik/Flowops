import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../index';

// ─── Mock Prisma ────────────────────────────────────────────────────
// We mock the db module so tests don't require a real database.
const mockUsers = new Map<string, {
  id: string;
  name: string | null;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}>();

vi.mock('../db', () => {
  const bcrypt = require('bcryptjs');
  return {
    default: {
      user: {
        findUnique: vi.fn(({ where }: { where: { email?: string; id?: string } }) => {
          if (where.email) {
            for (const u of mockUsers.values()) {
              if (u.email === where.email) return Promise.resolve(u);
            }
            return Promise.resolve(null);
          }
          if (where.id) {
            return Promise.resolve(mockUsers.get(where.id) ?? null);
          }
          return Promise.resolve(null);
        }),
        create: vi.fn(({ data }: { data: { name?: string; email: string; passwordHash: string } }) => {
          const user = {
            id: `user-${Date.now()}`,
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
    },
  };
});

beforeEach(() => {
  mockUsers.clear();
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('POST /api/auth/register', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user.name).toBe('Test User');
    // passwordHash must never appear
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.password).toBeUndefined();
    // cookie should be set
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'valid@example.com', password: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    // Register first
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'login@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('login@example.com');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should reject wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'wrongpw@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrongpw@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject nonexistent user with generic error', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    // Must not reveal whether email exists
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('GET /api/auth/me', () => {
  it('should return user when authenticated via cookie', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/auth/register')
      .send({ name: 'Me Test', email: 'me@example.com', password: 'password123' });

    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('me@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
