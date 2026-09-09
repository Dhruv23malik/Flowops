import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { register, login, me, logout } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

export default router;
