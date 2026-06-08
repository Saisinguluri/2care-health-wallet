import { Router } from 'express';
import {
  createShare,
  listSentShares,
  listReceivedShares,
  revokeShare,
} from '../controllers/shares.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.js';

const router = Router();

router.get('/sent', authenticate, requireOwner, listSentShares);
router.get('/received', authenticate, listReceivedShares);
router.post('/', authenticate, requireOwner, createShare);
router.delete('/:id', authenticate, requireOwner, revokeShare);

export default router;
