import { Router } from 'express';
import {
  createReport,
  listReports,
  getReport,
  updateReport,
  deleteReport,
  downloadReport,
  getReportTypes,
} from '../controllers/reports.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/meta/types', authenticate, getReportTypes);
router.get('/', authenticate, listReports);
router.post('/', authenticate, requireOwner, upload.single('file'), createReport);
router.get('/:id', authenticate, getReport);
router.get('/:id/download', authenticate, downloadReport);
router.patch('/:id', authenticate, requireOwner, updateReport);
router.delete('/:id', authenticate, requireOwner, deleteReport);

export default router;
