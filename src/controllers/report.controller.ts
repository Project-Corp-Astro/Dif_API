import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';
import * as reportService from '../services/report.service';
import { ReportType } from '../services/report.service';

/**
 * Create a new report
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
    
    // Validate report type
    if (!type || !Object.values(ReportType).includes(type)) {
      throw new ApiError(400, 'Invalid report type');
    }

    // Create report
    const report = await reportService.createReport(userId, type, parameters);
    
    res.status(201).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    logger.error('Error creating report:', error);
    next(error);
  }
};

/**
 * Get a report by ID
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

    const { id } = req.params;
    if (!id) {
      throw new ApiError(400, 'Report ID is required');
    }

    const report = await reportService.getReportById(userId, id);
    
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    logger.error('Error getting report:', error);
    next(error);
  }
};

/**
 * Get all reports for a user
 */
export const getUserReports = async (
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
    const type = req.query.type as ReportType | undefined;

    // Validate type if provided
    if (type && !Object.values(ReportType).includes(type)) {
      throw new ApiError(400, 'Invalid report type');
    }

    const result = await reportService.getUserReports(userId, limit, offset, type);
    
    res.status(200).json({
      status: 'success',
      data: {
        reports: result.reports,
        total: result.total
      }
    });
  } catch (error) {
    logger.error('Error getting user reports:', error);
    next(error);
  }
};

/**
 * Delete a report
 */
export const deleteReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }

    const { id } = req.params;
    if (!id) {
      throw new ApiError(400, 'Report ID is required');
    }

    await reportService.deleteReport(userId, id);
    
    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error('Error deleting report:', error);
    next(error);
  }
};

/**
 * Get a download URL for a report
 */
export const getReportDownloadUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }

    const { id } = req.params;
    if (!id) {
      throw new ApiError(400, 'Report ID is required');
    }

    const downloadInfo = await reportService.getReportDownloadUrl(userId, id);
    
    res.status(200).json({
      status: 'success',
      data: downloadInfo
    });
  } catch (error) {
    logger.error('Error getting report download URL:', error);
    next(error);
  }
};
