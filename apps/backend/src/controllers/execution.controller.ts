import { Response, NextFunction, Request } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../db';
import { WorkflowExecutor } from '../services/execution/workflow-executor';
import { WorkflowGraph, validateWorkflowGraph, RunWorkflowRequestSchema } from '@flowops/schemas';
import { verifyWebhookToken } from '../utils/webhook';

const executor = new WorkflowExecutor();

async function executeWorkflowGraph(
  workflow: {
    id: string;
    userId: string;
    nodes: unknown;
    edges: unknown;
    versions: Array<{ id: string; version: number; graph: unknown }>;
  },
  input: Record<string, unknown>,
) {
  const currentGraph: WorkflowGraph = {
    nodes: (workflow.nodes as WorkflowGraph['nodes']) ?? [],
    edges: (workflow.edges as WorkflowGraph['edges']) ?? [],
  };

  if (currentGraph.nodes.length === 0) {
    return { errorStatus: 400, code: 'EMPTY_WORKFLOW', message: 'Workflow has no nodes. Add nodes before running.' };
  }

  const validation = validateWorkflowGraph(currentGraph);
  if (!validation.success) {
    return {
      errorStatus: 400,
      code: 'INVALID_WORKFLOW',
      message: `Invalid workflow graph: ${validation.errors.join(', ')}`,
    };
  }

  const latestVersion = workflow.versions[0] ?? null;
  let versionToRun = latestVersion;

  const needsNewVersion = !latestVersion || !graphsAreEqual(
    currentGraph,
    latestVersion.graph as unknown as WorkflowGraph,
  );

  if (needsNewVersion) {
    versionToRun = await db.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        version: (latestVersion?.version ?? 0) + 1,
        graph: currentGraph as any,
      },
    });
  }

  const execution = await executor.run(workflow.id, versionToRun!.id, currentGraph, workflow.userId, input);
  return { execution };
}

// POST /api/workflows/:id/run
export async function runWorkflow(req: AuthRequest, res: Response, _next: NextFunction): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  const parsedInput = RunWorkflowRequestSchema.safeParse(req.body ?? {});
  if (!parsedInput.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input payload. Expected { input?: object }' },
    });
    return;
  }

  try {
    const workflow = await db.workflow.findFirst({
      where: { id, userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!workflow) {
      res.status(404).json({
        success: false,
        error: { code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' },
      });
      return;
    }

    const result = await executeWorkflowGraph(workflow, parsedInput.data.input ?? {});
    if ('errorStatus' in result) {
      res.status(result.errorStatus!).json({
        success: false,
        error: { code: result.code, message: result.message },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { execution: result.execution },
    });
  } catch (err: any) {
    const safeMessage = process.env.NODE_ENV === 'production'
      ? 'Failed to start workflow execution'
      : err.message;
    res.status(400).json({
      success: false,
      error: { code: 'EXECUTION_START_FAILED', message: safeMessage },
    });
  }
}

// POST /api/webhooks/:workflowId
export async function triggerWebhook(req: Request, res: Response): Promise<void> {
  const { workflowId } = req.params;
  const providedToken =
    (req.headers['x-flowops-webhook-token'] as string | undefined) ||
    (typeof req.query.token === 'string' ? req.query.token : undefined);

  try {
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!workflow || !verifyWebhookToken(workflow.id, workflow.userId, providedToken)) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_WEBHOOK_TOKEN', message: 'Invalid webhook token or workflow not found' },
      });
      return;
    }

    if (workflow.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        error: { code: 'WORKFLOW_NOT_ACTIVE', message: 'Workflow must be ACTIVE to accept webhook triggers' },
      });
      return;
    }

    const input = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : { payload: req.body };

    const result = await executeWorkflowGraph(workflow, input);
    if ('errorStatus' in result) {
      res.status(result.errorStatus!).json({
        success: false,
        error: { code: result.code, message: result.message },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { execution: result.execution },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'WEBHOOK_EXECUTION_FAILED', message: 'Failed to execute webhook workflow' },
    });
  }
}

/** Deep-compare two workflow graphs by value (order-insensitive for nodes/edges) */
function graphsAreEqual(a: WorkflowGraph, b: WorkflowGraph): boolean {
  if (a.nodes.length !== b.nodes.length || a.edges.length !== b.edges.length) return false;

  const sortedNodes = (nodes: WorkflowGraph['nodes']) =>
    [...nodes].sort((x, y) => x.id.localeCompare(y.id));
  const sortedEdges = (edges: WorkflowGraph['edges']) =>
    [...edges].sort((x, y) => x.id.localeCompare(y.id));

  return (
    JSON.stringify(sortedNodes(a.nodes)) === JSON.stringify(sortedNodes(b.nodes)) &&
    JSON.stringify(sortedEdges(a.edges)) === JSON.stringify(sortedEdges(b.edges))
  );
}

// GET /api/executions
export async function listExecutions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user!.userId;

  try {
    const executions = await db.execution.findMany({
      where: {
        workflow: { userId },
      },
      include: {
        workflow: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: { executions } });
  } catch (err) {
    next(err);
  }
}

// GET /api/executions/:id
export async function getExecution(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const execution = await db.execution.findFirst({
      where: { id, workflow: { userId } },
      include: {
        workflow: { select: { name: true } },
        steps: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!execution) {
      res.status(404).json({
        success: false,
        error: { code: 'EXECUTION_NOT_FOUND', message: 'Execution not found' },
      });
      return;
    }

    res.json({ success: true, data: { execution } });
  } catch (err) {
    next(err);
  }
}
