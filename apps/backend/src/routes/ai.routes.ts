import { Router } from 'express';
import { generateWorkflow } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/generate-workflow', requireAuth, generateWorkflow);

export default router;
