import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { listExecutions, getExecution } from '../controllers/execution.controller';

const router = Router();

router.use(requireAuth);

router.get('/', listExecutions);
router.get('/:id', getExecution);

export default router;
