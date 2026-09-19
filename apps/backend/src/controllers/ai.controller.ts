import { Response, NextFunction } from 'express';
import { GenerateWorkflowRequestSchema } from '@flowops/schemas';
import { AuthRequest } from '../auth';
import { WorkflowGenerator } from '../services/workflow-generator';

const generator = new WorkflowGenerator();

export async function generateWorkflow(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = GenerateWorkflowRequestSchema.safeParse(req.body);
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

    const { prompt, workflowId } = parsed.data;

    const result = await generator.generate(prompt, workflowId);

    if (!result.success || !result.workflow) {
      res.status(500).json({
        success: false,
        error: {
          code: 'AI_WORKFLOW_GENERATION_FAILED',
          message: 'Unable to generate a valid workflow. Please try again or simplify your request.',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        workflow: result.workflow,
      },
    });
  } catch (err) {
    next(err);
  }
}

import { WorkflowDebugger } from '../services/workflow-debugger';
import { AiDebugExecutionRequestSchema } from '@flowops/schemas';

const debuggerService = new WorkflowDebugger();

export async function debugExecution(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = AiDebugExecutionRequestSchema.safeParse(req.body);
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

    const { executionId } = parsed.data;
    const userId = req.user!.userId;

    const result = await debuggerService.debugExecution(executionId, userId);

    if (!result.success || !result.diagnosis) {
      res.status(500).json({
        success: false,
        error: {
          code: 'AI_DEBUGGER_FAILED',
          message: result.error || 'Unable to diagnose the execution.',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: result.diagnosis,
    });
  } catch (err) {
    next(err);
  }
}
