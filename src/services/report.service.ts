import { Queue } from 'bullmq';
import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';
import { redis } from '../config/redis';

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
  status: ReportStatus;
  parameters?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Create a BullMQ queue for report generation
const reportQueue = new Queue('report-generation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});

/**
 * Create a new report
 */
export const createReport = async (
  userId: string,
  type: ReportType,
  parameters?: Record<string, any>
): Promise<Report> => {
  try {
    // Generate report title and description based on type
    const { title, description } = generateReportMetadata(type, parameters);
    
    // Create report in database
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    
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
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
      
    if (error) {
      logger.error('Error creating report:', error);
      throw new ApiError(500, 'Failed to create report');
    }
    
    // Add job to queue
    await reportQueue.add('generate-report', {
      reportId,
      userId,
      type,
      parameters,
    });
    
    // Return report data
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type as ReportType,
      title: data.title,
      description: data.description,
      status: data.status as ReportStatus,
      parameters: data.parameters,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in createReport:', error);
    throw new ApiError(500, 'Failed to create report');
  }
};

/**
 * Get a report by ID
 */
export const getReportById = async (
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
    
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type as ReportType,
      title: data.title,
      description: data.description,
      fileUrl: data.file_url,
      status: data.status as ReportStatus,
      parameters: data.parameters,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in getReportById:', error);
    throw new ApiError(500, 'Failed to get report');
  }
};

/**
 * Get all reports for a user
 */
export const getUserReports = async (
  userId: string,
  limit = 10,
  offset = 0,
  type?: ReportType
): Promise<{ reports: Report[]; total: number }> => {
  try {
    // Build query
    let query = supabase
      .from('reports')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    // Add type filter if provided
    if (type) {
      query = query.eq('type', type);
    }
    
    // Execute query
    const { data, error, count } = await query;
      
    if (error) {
      logger.error('Error fetching user reports:', error);
      throw new ApiError(500, 'Failed to fetch reports');
    }
    
    // Transform to Report objects
    const reports: Report[] = data.map(report => ({
      id: report.id,
      userId: report.user_id,
      type: report.type as ReportType,
      title: report.title,
      description: report.description,
      fileUrl: report.file_url,
      status: report.status as ReportStatus,
      parameters: report.parameters,
      createdAt: new Date(report.created_at),
      updatedAt: new Date(report.updated_at),
    }));
    
    return {
      reports,
      total: count || 0,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in getUserReports:', error);
    throw new ApiError(500, 'Failed to fetch user reports');
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
    // Get report to check if it exists and belongs to the user
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
      const fileKey = data.file_url.split('/').pop();
      if (fileKey) {
        const { error: storageError } = await supabase.storage
          .from('reports')
          .remove([fileKey]);
          
        if (storageError) {
          logger.error('Error deleting report file:', storageError);
          // Continue with deletion even if file removal fails
        }
      }
    }
    
    // Delete report from database
    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', userId);
      
    if (deleteError) {
      logger.error('Error deleting report:', deleteError);
      throw new ApiError(500, 'Failed to delete report');
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in deleteReport:', error);
    throw new ApiError(500, 'Failed to delete report');
  }
};

/**
 * Get a download URL for a report
 */
export const getReportDownloadUrl = async (
  userId: string,
  reportId: string
): Promise<{ url: string; expiresAt: Date }> => {
  try {
    // Get report to check if it exists and belongs to the user
    const { data, error } = await supabase
      .from('reports')
      .select('file_url, status')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single();
      
    if (error || !data) {
      logger.error('Error fetching report for download:', error);
      throw new ApiError(404, 'Report not found');
    }
    
    // Check if report is completed and has a file
    if (data.status !== ReportStatus.COMPLETED || !data.file_url) {
      throw new ApiError(400, 'Report is not ready for download');
    }
    
    // Extract file key from URL
    const fileKey = data.file_url.split('/').pop();
    if (!fileKey) {
      throw new ApiError(500, 'Invalid file URL');
    }
    
    // Generate signed URL
    const { data: signedUrl, error: signedUrlError } = await supabase.storage
      .from('reports')
      .createSignedUrl(fileKey, 3600); // 1 hour expiry
      
    if (signedUrlError || !signedUrl) {
      logger.error('Error generating signed URL:', signedUrlError);
      throw new ApiError(500, 'Failed to generate download URL');
    }
    
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    return {
      url: signedUrl.signedUrl,
      expiresAt,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in getReportDownloadUrl:', error);
    throw new ApiError(500, 'Failed to get download URL');
  }
};

/**
 * Generate report metadata based on type and parameters
 */
const generateReportMetadata = (
  type: ReportType,
  parameters?: Record<string, any>
): { title: string; description: string } => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.toLocaleString('default', { month: 'long' });
  
  switch (type) {
    case ReportType.MONTHLY:
      return {
        title: `Monthly Horoscope Report - ${month} ${year}`,
        description: `Comprehensive astrological forecast for ${month} ${year}, including career, relationships, and personal growth insights.`,
      };
    case ReportType.YEARLY:
      return {
        title: `Yearly Horoscope Report - ${year}`,
        description: `Annual astrological forecast for ${year}, with detailed predictions and guidance for all major life areas.`,
      };
    case ReportType.COMPATIBILITY:
      const targetSign = parameters?.targetSign || 'your partner';
      return {
        title: `Compatibility Report with ${targetSign}`,
        description: `In-depth analysis of your astrological compatibility with ${targetSign}, covering emotional, intellectual, and physical harmony.`,
      };
    case ReportType.CAREER:
      return {
        title: `Career Path Report`,
        description: `Astrological insights into your optimal career path, strengths, challenges, and upcoming professional opportunities.`,
      };
    default:
      return {
        title: `Astrological Report - ${month} ${year}`,
        description: `Custom astrological report generated on ${now.toLocaleDateString()}.`,
      };
  }
};
