import { Router } from 'express';
import db from './db';
import { authenticate, AuthRequest, generateToken } from './auth';
import { WorkflowGenerator } from './services/workflow-generator';

const router = Router();
const workflowGenerator = new WorkflowGenerator();

// --- Auth Routes ---
router.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.user.create({
      data: { email, passwordHash: password } // Note: password should be hashed in production
    });
    const token = generateToken(user.id, user.email);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error: any) {
    res.status(400).json({ error: 'Could not register user' });
  }
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.user.findUnique({ where: { email } });
  
  if (!user || user.passwordHash !== password) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  
  const token = generateToken(user.id, user.email);
  res.json({ token, user: { id: user.id, email: user.email } });
});

// --- Workflow Routes ---
router.post('/workflows', authenticate, async (req: AuthRequest, res) => {
  const { name, description } = req.body;
  const userId = req.user!.userId;
  
  try {
    const workflow = await db.workflow.create({
      data: { name, description, userId }
    });
    res.status(201).json(workflow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

router.get('/workflows', authenticate, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const workflows = await db.workflow.findMany({ where: { userId } });
  res.json(workflows);
});

router.get('/workflows/:id', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const workflow = await db.workflow.findFirst({
    where: { id, userId },
    include: { versions: true }
  });
  
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' });
    return;
  }
  res.json(workflow);
});

// --- LLM Generation Route ---
router.post('/workflows/generate', authenticate, async (req: AuthRequest, res) => {
  const { prompt, workflowId } = req.body;
  const userId = req.user!.userId;

  if (!prompt || prompt.length < 10) {
    res.status(400).json({ error: 'Prompt must be at least 10 characters' });
    return;
  }

  try {
    const result = await workflowGenerator.generate(prompt, workflowId);

    if (!result.success || !result.workflow) {
      res.status(422).json({
        error: 'Failed to generate a valid workflow',
        details: result.error,
        attempts: result.attempts,
      });
      return;
    }

    // Create workflow + first version if no workflowId provided
    let targetWorkflowId = workflowId;
    if (!targetWorkflowId) {
      const workflow = await db.workflow.create({
        data: {
          name: prompt.substring(0, 80),
          description: prompt,
          userId,
        },
      });
      targetWorkflowId = workflow.id;
    }

    // Get the next version number
    const latestVersion = await db.workflowVersion.findFirst({
      where: { workflowId: targetWorkflowId },
      orderBy: { version: 'desc' },
    });

    const version = await db.workflowVersion.create({
      data: {
        workflowId: targetWorkflowId,
        version: (latestVersion?.version ?? 0) + 1,
        graph: result.workflow as any,
      },
    });

    res.status(201).json({
      workflowId: targetWorkflowId,
      versionId: version.id,
      version: version.version,
      graph: result.workflow,
      attempts: result.attempts,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal error during workflow generation', details: error.message });
  }
});

// --- Execution Routes ---
router.post('/workflows/:id/executions', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const { versionId } = req.body; // if we want to execute a specific version
  
  const workflow = await db.workflow.findFirst({
    where: { id, userId },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
  });
  
  if (!workflow || workflow.versions.length === 0) {
    res.status(400).json({ error: 'Workflow or version not found' });
    return;
  }
  
  const targetVersionId = versionId || workflow.versions[0].id;
  
  const execution = await db.execution.create({
    data: {
      workflowId: id,
      workflowVersionId: targetVersionId,
      status: 'QUEUED'
    }
  });
  
  res.status(201).json(execution);
});

router.get('/executions/:id', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  
  const execution = await db.execution.findUnique({
    where: { id },
    include: {
      workflow: true,
      steps: { include: { logs: true } }
    }
  });
  
  if (!execution || execution.workflow.userId !== userId) {
    res.status(404).json({ error: 'Execution not found' });
    return;
  }
  
  res.json(execution);
});

export default router;
