import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Smoke tests cover pure logic only (graph validation, defaults,
    // execution stats, workflow export) — no DOM or React rendering.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
