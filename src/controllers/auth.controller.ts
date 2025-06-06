import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { config } from '../config';
import { logger } from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';
import { redis } from '../config/redis';

/**
 * Register a new user
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }
    
    // Register user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });
    
    if (authError) {
      logger.error('Error registering user:', authError);
      throw new ApiError(400, authError.message);
    }
    
    // Create user profile in database
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          name,
          created_at: new Date().toISOString(),
        });
        
      if (profileError) {
        logger.error('Error creating user profile:', profileError);
        // Continue anyway since auth was successful
      }
    }
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: authData.user?.id,
        email: authData.user?.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }
    
    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      logger.error('Error logging in:', error);
      throw new ApiError(401, 'Invalid credentials');
    }
    
    if (!data.user || !data.session) {
      throw new ApiError(500, 'Authentication failed');
    }
    
    // Generate JWT tokens
    const accessToken = jwt.sign(
      {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata.role || 'user',
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    
    const refreshToken = jwt.sign(
      { id: data.user.id },
      config.jwtSecret,
      { expiresIn: config.jwtRefreshExpiresIn }
    );
    
    // Store refresh token in Redis
    await redis.set(
      `refresh_token:${data.user.id}`,
      refreshToken,
      'EX',
      7 * 24 * 60 * 60 // 7 days
    );
    
    // Get user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profileData?.name || data.user.user_metadata.name,
        role: data.user.user_metadata.role || 'user',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required');
    }
    
    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwtSecret) as { id: string };
    } catch (error) {
      throw new ApiError(401, 'Invalid refresh token');
    }
    
    // Check if refresh token exists in Redis
    const storedToken = await redis.get(`refresh_token:${decoded.id}`);
    
    if (!storedToken || storedToken !== refreshToken) {
      throw new ApiError(401, 'Invalid refresh token');
    }
    
    // Get user from Supabase
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data.user) {
      throw new ApiError(401, 'User not found');
    }
    
    // Generate new access token
    const accessToken = jwt.sign(
      {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata.role || 'user',
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    
    res.status(200).json({
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }
    
    // Remove refresh token from Redis
    await redis.del(`refresh_token:${userId}`);
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      throw new ApiError(400, 'Email is required');
    }
    
    // Send password reset email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.origin}/reset-password`,
    });
    
    if (error) {
      logger.error('Error requesting password reset:', error);
      // Don't expose if email exists or not for security
    }
    
    // Always return success to prevent email enumeration
    res.status(200).json({
      message: 'Password reset instructions sent if email exists',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { password, token } = req.body;
    
    if (!password || !token) {
      throw new ApiError(400, 'Password and token are required');
    }
    
    // Update password via Supabase
    const { error } = await supabase.auth.updateUser({
      password,
    });
    
    if (error) {
      logger.error('Error resetting password:', error);
      throw new ApiError(400, 'Failed to reset password');
    }
    
    res.status(200).json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email with token
 */
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      throw new ApiError(400, 'Token is required');
    }
    
    // Verify email via Supabase
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });
    
    if (error) {
      logger.error('Error verifying email:', error);
      throw new ApiError(400, 'Failed to verify email');
    }
    
    res.status(200).json({
      message: 'Email verified successfully',
    });
  } catch (error) {
    next(error);
  }
};
