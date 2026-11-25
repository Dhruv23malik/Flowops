import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import authRoutes from './auth.routes';
import workflowRoutes from './workflow.routes';
import aiRoutes from './ai.routes';
import executionRoutes from './execution.routes';
import { requireAuth } from '../middleware/auth.middleware';
import { triggerWebhook } from '../controllers/execution.controller';

const router = Router();

// ─── Rate Limiters ────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' } },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'AI request limit reached, please wait' } },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, // 100 general API requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Health Check ─────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// ─── Auth Routes (rate-limited) ───────────────────────────────────
router.use('/auth', authLimiter, authRoutes);

// ─── Workflow CRUD Routes ─────────────────────────────────────────
router.use('/workflows', apiLimiter, workflowRoutes);

// ─── AI Routes (rate-limited) ─────────────────────────────────────
router.use('/ai', requireAuth, aiLimiter, aiRoutes);

// ─── Execution Routes ─────────────────────────────────────────────
router.use('/executions', apiLimiter, executionRoutes);

// ─── Public Webhook Trigger (HMAC-token verified) ──────────────────
router.post('/webhooks/:workflowId', apiLimiter, triggerWebhook);

export default router;
