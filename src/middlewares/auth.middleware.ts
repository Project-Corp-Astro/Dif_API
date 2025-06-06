import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ApiError } from './error.middleware';
import { supabase } from '../config/supabase';

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        id: string;
        email: string;
        role: string;
      };

      // Attach user to request
      req.user = decoded;
      next();
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired token');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }

    next();
  };
};

/**
 * Middleware to validate Supabase session
 * This is useful for routes that need to verify the user's Supabase session
 */
export const validateSupabaseSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    // Verify Supabase session
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      throw new ApiError(401, 'Invalid or expired Supabase session');
    }

    // Attach user to request
    req.user = {
      id: data.user.id,
      email: data.user.email || '',
      role: data.user.role || 'user',
    };
    
    next();
  } catch (error) {
    next(error);
  }
};
