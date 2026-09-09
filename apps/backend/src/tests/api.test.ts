import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../index';

// Minimal mock to prevent DB connection in health test
vi.mock('../db', () => ({
  default: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    workflow: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

describe('Health check', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});