import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../db';
import { WorkflowExecutor } from '../services/execution/workflow-executor';
import { WorkflowGraph, validateWorkflowGraph } from '@flowops/schemas';

const executor = new WorkflowExecutor();

// POST /api/workflows/:id/run
export async function runWorkflow(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

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

    // Build the current graph from the workflow's nodes/edges columns
    const currentGraph: WorkflowGraph = {
      nodes: (workflow as any).nodes as WorkflowGraph['nodes'] ?? [],
      edges: (workflow as any).edges as WorkflowGraph['edges'] ?? [],
    };

    if (currentGraph.nodes.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'EMPTY_WORKFLOW', message: 'Workflow has no nodes. Add nodes before running.' },
      });
      return;
    }

    // Validate graph BEFORE creating a version — reject invalid graphs
    // without leaving orphan version rows in the database.
    const validation = validateWorkflowGraph(currentGraph);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_WORKFLOW',
          message: `Invalid workflow graph: ${validation.errors.join(', ')}`,
        },
      });
      return;
    }

    // Determine if we need a new version:
    // - No versions exist yet, OR
    // - The current graph differs from the latest version's graph
    const latestVersion = workflow.versions[0] ?? null;
    let versionToRun = latestVersion;

    const needsNewVersion = !latestVersion || !graphsAreEqual(
      currentGraph,
      latestVersion.graph as unknown as WorkflowGraph
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

    // The executor validates the graph, runs it, and saves state
    const execution = await executor.run(workflow.id, versionToRun!.id, currentGraph, userId);

    res.status(200).json({
      success: true,
      data: { execution },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'EXECUTION_START_FAILED', message: err.message },
    });
  }
}

/** Deep-compare two workflow graphs by value (order-insensitive for nodes) */
function graphsAreEqual(a: WorkflowGraph, b: WorkflowGraph): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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
