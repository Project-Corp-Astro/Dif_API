import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { 
  createReport,
  getReportById,
  getUserReports,
  getReportDownloadUrl,
  deleteReport
} from '../controllers/report.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create a new report
router.post('/', createReport);

// Get all reports for the authenticated user
router.get('/', getUserReports);

// Get a specific report by ID
router.get('/:reportId', getReportById);

// Get download URL for a report file
router.get('/:reportId/download', getReportDownloadUrl);

// Delete a report
router.delete('/:reportId', deleteReport);

export default router;
