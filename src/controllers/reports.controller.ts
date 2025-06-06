import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';
import { 
  generateReport, 
  getReport, 
  getUserReports, 
  getReportFileUrl, 
  deleteReport,
  ReportType
} from '../services/reports.service';

/**
 * Generate a new report
 */
export const createReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }
    
    const { type, parameters } = req.body;
    
    if (!type || !Object.values(ReportType).includes(type)) {
      throw new ApiError(400, 'Valid report type is required');
    }
    
    if (!parameters || typeof parameters !== 'object') {
      throw new ApiError(400, 'Report parameters are required');
    }
    
    const report = await generateReport(userId, type, parameters);
    
    res.status(201).json(report);
  } catch (error) {
    logger.error('Error creating report:', error);
    next(error);
  }
};

/**
 * Get a specific report by ID
 */
export const getReportById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }
    
    const { reportId } = req.params;
    
    if (!reportId) {
      throw new ApiError(400, 'Report ID is required');
    }
    
    const report = await getReport(userId, reportId);
    
    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all reports for the authenticated user
 */
export const getAllReports = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }
    
    const limit = parseInt(req.query.limit as string || '10', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);
    
    const reports = await getUserReports(userId, limit, offset);
    
    res.status(200).json(reports);
  } catch (error) {
    next(error);
  }
};

/**
 * Get download URL for a report file
 */
export const getDownloadUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }
    
    const { reportId } = req.params;
    
    if (!reportId) {
      throw new ApiError(400, 'Report ID is required');
    }
    
    const url = await getReportFileUrl(userId, reportId);
    
    res.status(200).json({ url });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a report
 */
export const removeReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }
    
    const { reportId } = req.params;
    
    if (!reportId) {
      throw new ApiError(400, 'Report ID is required');
    }
    
    await deleteReport(userId, reportId);
    
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
