import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to capture the raw request body for webhook signature verification
 * This is needed because Express consumes the request stream when parsing JSON
 */
export const captureRawBody = (req: Request, res: Response, next: NextFunction) => {
  // Skip if not a webhook route or not JSON content type
  if (!req.path.includes('/webhook') || 
      !req.headers['content-type']?.includes('application/json')) {
    return next();
  }
  
  let data = '';
  
  // Capture data chunks
  req.on('data', chunk => {
    data += chunk;
  });
  
  // When complete, store the raw body and continue
  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
  
  // Handle errors
  req.on('error', error => {
    console.error('Error capturing raw body:', error);
    next(error);
  });
};

// Extend Express Request type to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
    }
  }
}
