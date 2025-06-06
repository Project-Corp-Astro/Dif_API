import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ZodError } from 'zod';

// Custom error class for API errors
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle specific error types
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      isOperational: err.isOperational,
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors,
    });
  }

  // Default to 500 server error
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};
