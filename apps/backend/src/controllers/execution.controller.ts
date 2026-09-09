import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../db';
import { WorkflowExecutor } from '../services/execution/workflow-executor';
import { WorkflowGraph } from '@flowops/schemas';

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

    if (!workflow || workflow.versions.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found or has no versions saved' },
      });
      return;
    }

    const latestVersion = workflow.versions[0];
    const graph = latestVersion.graph as unknown as WorkflowGraph;

    // The executor validates the graph, runs it, and saves state
    const execution = await executor.run(workflow.id, latestVersion.id, graph);

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
