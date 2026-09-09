import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { list, getOne, create, update, remove } from '../controllers/workflow.controller';
import { runWorkflow } from '../controllers/execution.controller';

const router = Router();

// All workflow routes require authentication
router.use(requireAuth);

router.get('/', list);
router.post('/', create);
router.get('/:id', getOne);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/:id/run', runWorkflow);

export default router;
