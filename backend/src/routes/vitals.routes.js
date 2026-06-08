import { Router } from 'express';
import {
  createVital,
  listVitals,
  getVitalTrends,
  deleteVital,
  getVitalSummary,
} from '../controllers/vitals.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authenticate, requireOwner, getVitalSummary);
router.get('/trends', authenticate, requireOwner, getVitalTrends);
router.get('/', authenticate, requireOwner, listVitals);
router.post('/', authenticate, requireOwner, createVital);
router.delete('/:id', authenticate, requireOwner, deleteVital);

export default router;
