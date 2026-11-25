import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { register, login, me, logout, guestLogin, upgradeGuest } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/guest', guestLogin);
router.post('/upgrade-guest', requireAuth, upgradeGuest);
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

export default router;
