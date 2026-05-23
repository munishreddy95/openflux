import { Router } from 'express';
import { createTemporaryPassword, createUserAccount, listAllUsers } from '../controllers/user.controller.js';

const router = Router();

router.get('/', listAllUsers);
router.post('/', createUserAccount);
router.post('/:id/temporary-password', createTemporaryPassword);

export default router;
