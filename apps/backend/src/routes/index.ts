import { Router } from 'express';
import authRoutes from './auth.routes';
import workflowRoutes from './workflow.routes';
import aiRoutes from './ai.routes';
import executionRoutes from './execution.routes';
import db from '../db';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { WorkflowGenerator } from '../services/workflow-generator';

const router = Router();
const workflowGenerator = new WorkflowGenerator();

// ─── Health Check ─────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// ─── Auth Routes ─────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ─── Workflow CRUD Routes ─────────────────────────────────────────
router.use('/workflows', workflowRoutes);

// ─── AI Routes ───────────────────────────────────────────────────
router.use('/ai', aiRoutes);

// ─── Execution Routes ─────────────────────────────────────────────
router.use('/executions', executionRoutes);

// ─── LLM Generation Route (Phase 1 — preserved for later phases) ─
router.post('/workflows/generate', requireAuth, async (req: AuthRequest, res, next) => {
  const { prompt, workflowId } = req.body;
  const userId = req.user!.userId;

  if (!prompt || prompt.length < 10) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Prompt must be at least 10 characters' },
    });
    return;
  }

  try {
    const result = await workflowGenerator.generate(prompt, workflowId);

    if (!result.success || !result.workflow) {
      res.status(422).json({
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: 'Failed to generate a valid workflow',
        },
        data: { details: result.error, attempts: result.attempts },
      });
      return;
    }

    let targetWorkflowId = workflowId;
    if (!targetWorkflowId) {
      const workflow = await db.workflow.create({
        data: { name: prompt.substring(0, 80), description: prompt, userId },
      });
      targetWorkflowId = workflow.id;
    }

    const latestVersion = await db.workflowVersion.findFirst({
      where: { workflowId: targetWorkflowId },
      orderBy: { version: 'desc' },
    });

    const version = await db.workflowVersion.create({
      data: {
        workflowId: targetWorkflowId,
        version: (latestVersion?.version ?? 0) + 1,
        graph: result.workflow as object,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        workflowId: targetWorkflowId,
        versionId: version.id,
        version: version.version,
        graph: result.workflow,
        attempts: result.attempts,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
