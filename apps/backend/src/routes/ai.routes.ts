import { Router } from 'express';
import { generateWorkflow, debugExecution } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/generate-workflow', requireAuth, generateWorkflow);
router.post('/debug-execution', requireAuth, debugExecution);

export default router;
