import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';
import { redis } from '../config/redis';
import { Queue } from 'bullmq';
import { getHoroscope, ZodiacSign } from './horoscope.service';

// Initialize BullMQ queue
const reportQueue = new Queue('report-generation', {
  connection: {
    host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
    port: parseInt(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port || '6379'),
  },
});

// Report types
export enum ReportType {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  COMPATIBILITY = 'compatibility',
  CAREER = 'career',
}

// Report status
export enum ReportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Report interface
export interface Report {
  id: string;
  userId: string;
  type: ReportType;
  title: string;
  description: string;
  fileUrl?: string;
  createdAt: Date;
  status: ReportStatus;
  parameters: Record<string, any>;
}

/**
 * Generate a new report
 */
export const generateReport = async (
  userId: string,
  type: ReportType,
  parameters: Record<string, any>
): Promise<Report> => {
  try {
    // Validate parameters based on report type
    validateReportParameters(type, parameters);
    
    // Generate report ID
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create report title and description
    const { title, description } = generateReportMetadata(type, parameters);
    
    // Create report record in database
    const { data, error } = await supabase
      .from('reports')
      .insert({
        id: reportId,
        user_id: userId,
        type,
        title,
        description,
        status: ReportStatus.PENDING,
        parameters,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
      
    if (error) {
      logger.error('Error creating report record:', error);
      throw new ApiError(500, 'Failed to create report');
    }
    
    // Add job to queue for processing
    await reportQueue.add('generate-report', {
      reportId,
      userId,
      type,
      parameters,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
    
    // Return report data
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      description: data.description,
      createdAt: new Date(data.created_at),
      status: data.status,
      parameters: data.parameters,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error generating report:', error);
    throw new ApiError(500, 'Failed to generate report');
  }
};

/**
 * Get report by ID
 */
export const getReport = async (
  userId: string,
  reportId: string
): Promise<Report> => {
  try {
    // Get report from database
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single();
      
    if (error || !data) {
      logger.error('Error fetching report:', error);
      throw new ApiError(404, 'Report not found');
    }
    
    // Return report data
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      description: data.description,
      fileUrl: data.file_url,
      createdAt: new Date(data.created_at),
      status: data.status,
      parameters: data.parameters,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error getting report:', error);
    throw new ApiError(500, 'Failed to get report');
  }
};

/**
 * Get all reports for a user
 */
export const getUserReports = async (
  userId: string,
  limit = 10,
  offset = 0
): Promise<Report[]> => {
  try {
    // Get reports from database
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) {
      logger.error('Error fetching user reports:', error);
      throw new ApiError(500, 'Failed to fetch reports');
    }
    
    // Transform to Report objects
    return data.map(report => ({
      id: report.id,
      userId: report.user_id,
      type: report.type,
      title: report.title,
      description: report.description,
      fileUrl: report.file_url,
      createdAt: new Date(report.created_at),
      status: report.status,
      parameters: report.parameters,
    }));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error getting user reports:', error);
    throw new ApiError(500, 'Failed to get user reports');
  }
};

/**
 * Get signed URL for report file
 */
export const getReportFileUrl = async (
  userId: string,
  reportId: string
): Promise<string> => {
  try {
    // Get report from database
    const { data, error } = await supabase
      .from('reports')
      .select('file_url, status')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single();
      
    if (error || !data) {
      logger.error('Error fetching report for URL:', error);
      throw new ApiError(404, 'Report not found');
    }
    
    // Check if report is completed
    if (data.status !== ReportStatus.COMPLETED || !data.file_url) {
      throw new ApiError(400, 'Report is not ready yet');
    }
    
    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('reports')
      .createSignedUrl(data.file_url, 60 * 60); // 1 hour expiry
      
    if (signedUrlError || !signedUrlData?.signedUrl) {
      logger.error('Error generating signed URL:', signedUrlError);
      throw new ApiError(500, 'Failed to generate download URL');
    }
    
    return signedUrlData.signedUrl;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error getting report file URL:', error);
    throw new ApiError(500, 'Failed to get report download URL');
  }
};

/**
 * Delete a report
 */
export const deleteReport = async (
  userId: string,
  reportId: string
): Promise<void> => {
  try {
    // Get report to check if it exists and belongs to user
    const { data, error } = await supabase
      .from('reports')
      .select('file_url')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single();
      
    if (error || !data) {
      logger.error('Error fetching report for deletion:', error);
      throw new ApiError(404, 'Report not found');
    }
    
    // Delete file from storage if it exists
    if (data.file_url) {
      const { error: storageError } = await supabase
        .storage
        .from('reports')
        .remove([data.file_url]);
        
      if (storageError) {
        logger.error('Error deleting report file:', storageError);
        // Continue anyway to delete the database record
      }
    }
    
    // Delete report record from database
    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', userId);
      
    if (deleteError) {
      logger.error('Error deleting report record:', deleteError);
      throw new ApiError(500, 'Failed to delete report');
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error deleting report:', error);
    throw new ApiError(500, 'Failed to delete report');
  }
};

/**
 * Validate report parameters based on type
 */
const validateReportParameters = (
  type: ReportType,
  parameters: Record<string, any>
): void => {
  switch (type) {
    case ReportType.MONTHLY:
      if (!parameters.month || !parameters.year) {
        throw new ApiError(400, 'Month and year are required for monthly reports');
      }
      break;
      
    case ReportType.YEARLY:
      if (!parameters.year) {
        throw new ApiError(400, 'Year is required for yearly reports');
      }
      break;
      
    case ReportType.COMPATIBILITY:
      if (!parameters.sign1 || !parameters.sign2) {
        throw new ApiError(400, 'Two zodiac signs are required for compatibility reports');
      }
      
      if (!Object.values(ZodiacSign).includes(parameters.sign1) || 
          !Object.values(ZodiacSign).includes(parameters.sign2)) {
        throw new ApiError(400, 'Invalid zodiac signs');
      }
      break;
      
    case ReportType.CAREER:
      if (!parameters.sign) {
        throw new ApiError(400, 'Zodiac sign is required for career reports');
      }
      
      if (!Object.values(ZodiacSign).includes(parameters.sign)) {
        throw new ApiError(400, 'Invalid zodiac sign');
      }
      break;
      
    default:
      throw new ApiError(400, 'Invalid report type');
  }
};

/**
 * Generate report metadata based on type and parameters
 */
const generateReportMetadata = (
  type: ReportType,
  parameters: Record<string, any>
): { title: string; description: string } => {
  switch (type) {
    case ReportType.MONTHLY:
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthName = monthNames[parameters.month - 1];
      
      return {
        title: `${monthName} ${parameters.year} Horoscope Report`,
        description: `Your comprehensive astrological forecast for ${monthName} ${parameters.year}.`,
      };
      
    case ReportType.YEARLY:
      return {
        title: `${parameters.year} Annual Horoscope Report`,
        description: `Your comprehensive astrological forecast for the year ${parameters.year}.`,
      };
      
    case ReportType.COMPATIBILITY:
      return {
        title: `${parameters.sign1.charAt(0).toUpperCase() + parameters.sign1.slice(1)} and ${parameters.sign2.charAt(0).toUpperCase() + parameters.sign2.slice(1)} Compatibility Report`,
        description: `A detailed analysis of the astrological compatibility between ${parameters.sign1} and ${parameters.sign2}.`,
      };
      
    case ReportType.CAREER:
      return {
        title: `${parameters.sign.charAt(0).toUpperCase() + parameters.sign.slice(1)} Career Report`,
        description: `A comprehensive career forecast and guidance for ${parameters.sign}.`,
      };
      
    default:
      return {
        title: 'Astrological Report',
        description: 'Your personalized astrological report.',
      };
  }
};
