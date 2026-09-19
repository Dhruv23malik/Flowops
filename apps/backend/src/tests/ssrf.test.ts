import { describe, it, expect } from 'vitest';
import { HttpRequestExecutor } from '../services/execution/node-executors/http-request.executor';

// ─── Unit tests for SSRF guard ───────────────────────────────────
// These test the static isPrivateIp method and the async isBlockedUrl method.

describe('SSRF Guard — isPrivateIp', () => {
  it('blocks 127.0.0.1 (IPv4 loopback)', () => {
    expect(HttpRequestExecutor.isPrivateIp('127.0.0.1')).toBe(true);
  });

  it('blocks 127.0.0.2 (loopback range)', () => {
    expect(HttpRequestExecutor.isPrivateIp('127.0.0.2')).toBe(true);
  });

  it('blocks 10.0.0.1 (RFC 1918)', () => {
    expect(HttpRequestExecutor.isPrivateIp('10.0.0.1')).toBe(true);
  });

  it('blocks 192.168.1.1 (RFC 1918)', () => {
    expect(HttpRequestExecutor.isPrivateIp('192.168.1.1')).toBe(true);
  });

  it('blocks 172.16.0.1 (RFC 1918)', () => {
    expect(HttpRequestExecutor.isPrivateIp('172.16.0.1')).toBe(true);
  });

  it('blocks 169.254.169.254 (AWS metadata)', () => {
    expect(HttpRequestExecutor.isPrivateIp('169.254.169.254')).toBe(true);
  });

  it('blocks ::1 (IPv6 loopback)', () => {
    expect(HttpRequestExecutor.isPrivateIp('::1')).toBe(true);
  });

  it('blocks ::ffff:127.0.0.1 (IPv4-mapped IPv6)', () => {
    expect(HttpRequestExecutor.isPrivateIp('::ffff:127.0.0.1')).toBe(true);
  });

  it('blocks ::ffff:10.0.0.1 (IPv4-mapped RFC 1918)', () => {
    expect(HttpRequestExecutor.isPrivateIp('::ffff:10.0.0.1')).toBe(true);
  });

  it('blocks ::ffff:192.168.1.1 (IPv4-mapped RFC 1918)', () => {
    expect(HttpRequestExecutor.isPrivateIp('::ffff:192.168.1.1')).toBe(true);
  });

  it('allows 8.8.8.8 (public IP)', () => {
    expect(HttpRequestExecutor.isPrivateIp('8.8.8.8')).toBe(false);
  });

  it('allows 93.184.216.34 (public IP)', () => {
    expect(HttpRequestExecutor.isPrivateIp('93.184.216.34')).toBe(false);
  });
});

describe('SSRF Guard — isBlockedUrl', () => {
  const executor = new HttpRequestExecutor();

  it('blocks unparseable URLs', async () => {
    expect(await executor.isBlockedUrl('not-a-url')).toBe(true);
  });

  it('blocks http://localhost', async () => {
    expect(await executor.isBlockedUrl('http://localhost/foo')).toBe(true);
  });

  it('blocks http://foo.localhost', async () => {
    expect(await executor.isBlockedUrl('http://foo.localhost/bar')).toBe(true);
  });

  it('blocks http://127.0.0.1', async () => {
    expect(await executor.isBlockedUrl('http://127.0.0.1:3000/api')).toBe(true);
  });

  it('blocks http://[::1]', async () => {
    expect(await executor.isBlockedUrl('http://[::1]:8080/test')).toBe(true);
  });

  it('blocks http://0.0.0.0', async () => {
    expect(await executor.isBlockedUrl('http://0.0.0.0/')).toBe(true);
  });

  it('blocks http://169.254.169.254 (metadata endpoint)', async () => {
    expect(await executor.isBlockedUrl('http://169.254.169.254/latest/meta-data/')).toBe(true);
  });
});
