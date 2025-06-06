import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';
import { getHoroscope, ZodiacSign } from '../services/horoscope.service';

/**
 * Get horoscope for a specific sign and date
 */
export const getDailyHoroscope = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sign, date } = req.params;
    
    // Validate sign
    if (!sign || !Object.values(ZodiacSign).includes(sign as ZodiacSign)) {
      throw new ApiError(400, 'Invalid zodiac sign');
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!date || !dateRegex.test(date)) {
      throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD');
    }
    
    // Get horoscope
    const horoscope = await getHoroscope(sign as ZodiacSign, date);
    
    res.status(200).json(horoscope);
  } catch (error) {
    logger.error('Error getting horoscope:', error);
    next(error);
  }
};

/**
 * Get horoscopes for all signs for a specific date
 */
export const getAllHoroscopes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { date } = req.params;
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!date || !dateRegex.test(date)) {
      throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD');
    }
    
    // Get horoscopes for all signs
    const horoscopePromises = Object.values(ZodiacSign).map(sign => 
      getHoroscope(sign, date)
    );
    
    const horoscopes = await Promise.all(horoscopePromises);
    
    res.status(200).json(horoscopes);
  } catch (error) {
    logger.error('Error getting all horoscopes:', error);
    next(error);
  }
};

/**
 * Get user's personal horoscope based on birth date
 */
export const getPersonalHoroscope = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }
    
    const { date } = req.params;
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!date || !dateRegex.test(date)) {
      throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD');
    }
    
    // Get user's birth date from profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('birth_date')
      .eq('id', userId)
      .single();
      
    if (error || !profile || !profile.birth_date) {
      throw new ApiError(400, 'Birth date not found in user profile');
    }
    
    // Determine zodiac sign from birth date
    const sign = getZodiacSignFromBirthDate(profile.birth_date);
    
    // Get horoscope
    const horoscope = await getHoroscope(sign, date);
    
    res.status(200).json({
      ...horoscope,
      personalizedFor: userId,
    });
  } catch (error) {
    logger.error('Error getting personal horoscope:', error);
    next(error);
  }
};

/**
 * Determine zodiac sign from birth date
 */
const getZodiacSignFromBirthDate = (birthDate: string): ZodiacSign => {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getDate();
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    return ZodiacSign.ARIES;
  } else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    return ZodiacSign.TAURUS;
  } else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    return ZodiacSign.GEMINI;
  } else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    return ZodiacSign.CANCER;
  } else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return ZodiacSign.LEO;
  } else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    return ZodiacSign.VIRGO;
  } else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    return ZodiacSign.LIBRA;
  } else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    return ZodiacSign.SCORPIO;
  } else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    return ZodiacSign.SAGITTARIUS;
  } else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return ZodiacSign.CAPRICORN;
  } else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    return ZodiacSign.AQUARIUS;
  } else {
    return ZodiacSign.PISCES;
  }
};
