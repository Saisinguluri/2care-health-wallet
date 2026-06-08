import { Router } from 'express';
import { searchUsers, getDashboardStats } from '../controllers/users.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.js';

const router = Router();

router.get('/search', authenticate, requireOwner, searchUsers);
router.get('/dashboard', authenticate, getDashboardStats);

export default router;
