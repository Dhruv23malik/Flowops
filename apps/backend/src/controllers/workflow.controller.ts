import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  WorkflowStatus,
} from '../services/workflow.service';

import {
  CreateWorkflowRequestSchema,
  UpdateWorkflowRequestSchema,
  validateWorkflowGraph,
} from '@flowops/schemas';

export async function list(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workflows = await listWorkflows(req.user!.userId);
    res.json({ success: true, data: workflows });
  } catch (err) {
    next(err);
  }
}

export async function getOne(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workflow = await getWorkflow(req.params.id, req.user!.userId);
    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
}

export async function create(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = CreateWorkflowRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message ?? 'Invalid input',
        },
      });
      return;
    }

    const workflow = await createWorkflow(req.user!.userId, {
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status as WorkflowStatus,
      nodes: parsed.data.nodes,
      edges: parsed.data.edges,
    });

    res.status(201).json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
}

export async function update(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = UpdateWorkflowRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message ?? 'Invalid input',
        },
      });
      return;
    }

    // If nodes are provided, validate the full graph
    if (parsed.data.nodes && parsed.data.nodes.length > 0) {
      const graphValidation = validateWorkflowGraph({
        nodes: parsed.data.nodes,
        edges: parsed.data.edges ?? [],
      });
      if (!graphValidation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'GRAPH_VALIDATION_ERROR',
            message: graphValidation.errors[0] ?? 'Invalid workflow graph',
            details: graphValidation.errors,
          },
        });
        return;
      }
    }

    const workflow = await updateWorkflow(req.params.id, req.user!.userId, {
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status as WorkflowStatus | undefined,
      nodes: parsed.data.nodes,
      edges: parsed.data.edges,
    });

    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
}

export async function remove(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteWorkflow(req.params.id, req.user!.userId);
    res.json({ success: true, data: { message: 'Workflow deleted successfully' } });
  } catch (err) {
    next(err);
  }
}
