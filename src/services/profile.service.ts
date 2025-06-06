import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';
import { redis } from '../config/redis';

// User profile interface
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  birthDate?: string;
  zodiacSign?: string;
  avatarUrl?: string;
  preferences?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  try {
    // Try to get from cache first
    const cacheKey = `profile:${userId}`;
    const cachedProfile = await redis.get(cacheKey);
    
    if (cachedProfile) {
      return JSON.parse(cachedProfile);
    }
    
    // Get profile from database
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      logger.error('Error fetching user profile:', error);
      throw new ApiError(404, 'User profile not found');
    }
    
    // Transform to UserProfile object
    const profile: UserProfile = {
      id: data.id,
      email: data.email,
      name: data.name,
      birthDate: data.birth_date,
      zodiacSign: data.zodiac_sign,
      avatarUrl: data.avatar_url,
      preferences: data.preferences,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at || data.created_at),
    };
    
    // Cache for 5 minutes
    await redis.set(cacheKey, JSON.stringify(profile), 'EX', 300);
    
    return profile;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in getUserProfile:', error);
    throw new ApiError(500, 'Failed to fetch user profile');
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  profileData: Partial<UserProfile>
): Promise<UserProfile> => {
  try {
    // Prepare data for database update
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    if (profileData.name !== undefined) updateData.name = profileData.name;
    if (profileData.birthDate !== undefined) updateData.birth_date = profileData.birthDate;
    if (profileData.zodiacSign !== undefined) updateData.zodiac_sign = profileData.zodiacSign;
    if (profileData.avatarUrl !== undefined) updateData.avatar_url = profileData.avatarUrl;
    if (profileData.preferences !== undefined) updateData.preferences = profileData.preferences;
    
    // Update profile in database
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
      
    if (error) {
      logger.error('Error updating user profile:', error);
      throw new ApiError(500, 'Failed to update user profile');
    }
    
    // Transform to UserProfile object
    const updatedProfile: UserProfile = {
      id: data.id,
      email: data.email,
      name: data.name,
      birthDate: data.birth_date,
      zodiacSign: data.zodiac_sign,
      avatarUrl: data.avatar_url,
      preferences: data.preferences,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
    
    // Invalidate cache
    await redis.del(`profile:${userId}`);
    
    return updatedProfile;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in updateUserProfile:', error);
    throw new ApiError(500, 'Failed to update user profile');
  }
};

/**
 * Update user avatar
 */
export const updateUserAvatar = async (
  userId: string,
  file: Buffer,
  fileType: string
): Promise<string> => {
  try {
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(fileType)) {
      throw new ApiError(400, 'Invalid file type. Only JPEG, PNG, and GIF are allowed');
    }
    
    // Generate file name
    const extension = fileType.split('/')[1];
    const fileName = `avatars/${userId}/${Date.now()}.${extension}`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('profiles')
      .upload(fileName, file, {
        contentType: fileType,
        upsert: true,
      });
      
    if (uploadError) {
      logger.error('Error uploading avatar:', uploadError);
      throw new ApiError(500, 'Failed to upload avatar');
    }
    
    // Get public URL
    const { data: urlData } = await supabase
      .storage
      .from('profiles')
      .getPublicUrl(fileName);
      
    if (!urlData?.publicUrl) {
      throw new ApiError(500, 'Failed to get avatar URL');
    }
    
    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
      
    if (updateError) {
      logger.error('Error updating avatar URL:', updateError);
      throw new ApiError(500, 'Failed to update avatar URL');
    }
    
    // Invalidate cache
    await redis.del(`profile:${userId}`);
    
    return urlData.publicUrl;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in updateUserAvatar:', error);
    throw new ApiError(500, 'Failed to update user avatar');
  }
};

/**
 * Delete user avatar
 */
export const deleteUserAvatar = async (userId: string): Promise<void> => {
  try {
    // Get current profile to get avatar URL
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();
      
    if (error || !data || !data.avatar_url) {
      throw new ApiError(404, 'Avatar not found');
    }
    
    // Extract file path from URL
    const url = new URL(data.avatar_url);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const filePath = `avatars/${userId}/${fileName}`;
    
    // Delete from storage
    const { error: deleteError } = await supabase
      .storage
      .from('profiles')
      .remove([filePath]);
      
    if (deleteError) {
      logger.error('Error deleting avatar file:', deleteError);
      throw new ApiError(500, 'Failed to delete avatar file');
    }
    
    // Update profile to remove avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
      
    if (updateError) {
      logger.error('Error removing avatar URL:', updateError);
      throw new ApiError(500, 'Failed to update profile');
    }
    
    // Invalidate cache
    await redis.del(`profile:${userId}`);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in deleteUserAvatar:', error);
    throw new ApiError(500, 'Failed to delete user avatar');
  }
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (
  userId: string,
  preferences: Record<string, any>
): Promise<Record<string, any>> => {
  try {
    // Get current preferences
    const { data, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .single();
      
    if (error) {
      logger.error('Error fetching user preferences:', error);
      throw new ApiError(500, 'Failed to fetch user preferences');
    }
    
    // Merge with new preferences
    const currentPreferences = data.preferences || {};
    const updatedPreferences = { ...currentPreferences, ...preferences };
    
    // Update in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        preferences: updatedPreferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
      
    if (updateError) {
      logger.error('Error updating user preferences:', updateError);
      throw new ApiError(500, 'Failed to update user preferences');
    }
    
    // Invalidate cache
    await redis.del(`profile:${userId}`);
    
    return updatedPreferences;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in updateUserPreferences:', error);
    throw new ApiError(500, 'Failed to update user preferences');
  }
};
