import { Worker } from 'bullmq';
import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import { ReportStatus, ReportType } from '../services/report.service';

// Initialize worker
const reportWorker = new Worker(
  'report-generation',
  async (job) => {
    try {
      const { reportId, userId, type, parameters } = job.data;
      
      logger.info(`Processing report job: ${reportId} for user: ${userId}`);
      
      // Update status to processing
      await updateReportStatus(reportId, ReportStatus.PROCESSING);
      
      // Process report based on type
      const fileUrl = await generateReport(reportId, userId, type, parameters);
      
      // Update report with file URL and completed status
      await updateReportComplete(reportId, fileUrl);
      
      logger.info(`Report generation completed: ${reportId}`);
      return { success: true, reportId, fileUrl };
    } catch (error) {
      logger.error('Error processing report job:', error);
      
      // Update report status to failed
      await updateReportStatus(job.data.reportId, ReportStatus.FAILED);
      
      throw error;
    }
  },
  {
    connection: {
      host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
      port: parseInt(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port || '6379'),
    },
    concurrency: 2,
  }
);

// Handle worker events
reportWorker.on('completed', (job) => {
  logger.info(`Report job completed: ${job.id}`);
});

reportWorker.on('failed', (job, error) => {
  if (job) {
    logger.error(`Report job failed: ${job.id}`, error);
  } else {
    logger.error('Report job failed with no job reference', error);
  }
});

// Helper functions
async function updateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', reportId);
    
  if (error) {
    logger.error(`Error updating report status: ${reportId}`, error);
    throw new Error(`Failed to update report status: ${error.message}`);
  }
}

async function updateReportComplete(reportId: string, fileUrl: string): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .update({
      status: ReportStatus.COMPLETED,
      file_url: fileUrl,
    })
    .eq('id', reportId);
    
  if (error) {
    logger.error(`Error updating report completion: ${reportId}`, error);
    throw new Error(`Failed to update report completion: ${error.message}`);
  }
}

async function generateReport(
  reportId: string,
  userId: string,
  type: ReportType,
  parameters: Record<string, any>
): Promise<string> {
  // Simulate report generation with a delay
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // In a real implementation, you would generate a PDF here
  // For now, we'll just create a placeholder file in storage
  
  // Generate file name
  const fileName = `reports/${userId}/${reportId}.pdf`;
  
  // Create a simple text file as a placeholder
  const content = `Report ID: ${reportId}\nType: ${type}\nParameters: ${JSON.stringify(parameters)}\nGenerated at: ${new Date().toISOString()}`;
  
  // Upload to Supabase Storage
  const { error } = await supabase
    .storage
    .from('reports')
    .upload(fileName, content, {
      contentType: 'application/pdf',
      upsert: true,
    });
    
  if (error) {
    logger.error(`Error uploading report file: ${reportId}`, error);
    throw new Error(`Failed to upload report file: ${error.message}`);
  }
  
  // Get public URL
  const { data } = await supabase
    .storage
    .from('reports')
    .getPublicUrl(fileName);
    
  if (!data?.publicUrl) {
    throw new Error('Failed to get report file URL');
  }
  
  return data.publicUrl;
}

export default reportWorker;
