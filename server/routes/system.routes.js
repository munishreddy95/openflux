import { Router } from 'express';
import { getUsageSnapshot } from '../controllers/system.controller.js';

const router = Router();

router.get('/usage', getUsageSnapshot);

export default router;
