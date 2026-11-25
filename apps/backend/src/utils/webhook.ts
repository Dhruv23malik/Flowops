import crypto from 'node:crypto';

function getWebhookSecret(): string {
  return process.env.JWT_SECRET || 'flowops-dev-secret';
}

/**
 * Generates a deterministic HMAC-SHA256 webhook token scoped to a specific
 * workflow and its owner, requiring zero extra database columns/migrations.
 */
export function generateWebhookToken(workflowId: string, userId: string): string {
  return crypto
    .createHmac('sha256', getWebhookSecret())
    .update(`flowops:webhook:${workflowId}:${userId}`)
    .digest('hex');
}

/**
 * Verifies an incoming webhook token in constant time.
 */
export function verifyWebhookToken(
  workflowId: string,
  userId: string,
  providedToken: string | undefined,
): boolean {
  if (!providedToken || typeof providedToken !== 'string') return false;
  const expected = generateWebhookToken(workflowId, userId);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(providedToken, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
