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
