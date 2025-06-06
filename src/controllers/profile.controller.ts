import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';
import {
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  deleteUserAvatar,
  updateUserPreferences
} from '../services/profile.service';

/**
 * Get user profile
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }
    
    const profile = await getUserProfile(userId);
    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }
    
    const { name, birthDate, zodiacSign } = req.body;
    
    const updatedProfile = await updateUserProfile(userId, {
      name,
      birthDate,
      zodiacSign
    });
    
    res.status(200).json(updatedProfile);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload user avatar
 */
export const uploadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }
    
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded');
    }
    
    const avatarUrl = await updateUserAvatar(
      userId,
      req.file.buffer,
      req.file.mimetype
    );
    
    res.status(200).json({ avatarUrl });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user avatar
 */
export const removeAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }
    
    await deleteUserAvatar(userId);
    
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user preferences
 */
export const updatePreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }
    
    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      throw new ApiError(400, 'Valid preferences object is required');
    }
    
    const updatedPreferences = await updateUserPreferences(userId, preferences);
    
    res.status(200).json({ preferences: updatedPreferences });
  } catch (error) {
    next(error);
  }
};
