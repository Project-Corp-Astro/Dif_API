import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import logger from '../utils/logger';

/**
 * Middleware to authenticate requests using JWT
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ success: false, message: 'No authentication token, access denied' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as { id: string };
    
    // Find user by id
    const user = await User.findById(decoded.id);
    
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }
    
    // Add user to request object
    (req as any).user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ success: false, message: 'Invalid token, access denied' });
  }
};
