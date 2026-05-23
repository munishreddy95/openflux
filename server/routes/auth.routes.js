import { Router } from 'express';
import { getSessionStatus, login, logout, updateOwnPassword } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/session', getSessionStatus);
router.post('/login', login);
router.post('/logout', logout);
router.post('/change-password', requireAuth, updateOwnPassword);

export default router;
