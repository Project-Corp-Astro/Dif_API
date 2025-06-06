import axios from 'axios';
import { supabase } from '../config/supabase';
import { config } from '../config';
import { logger } from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';
import { redis } from '../config/redis';

// Zodiac sign enum
export enum ZodiacSign {
  ARIES = 'aries',
  TAURUS = 'taurus',
  GEMINI = 'gemini',
  CANCER = 'cancer',
  LEO = 'leo',
  VIRGO = 'virgo',
  LIBRA = 'libra',
  SCORPIO = 'scorpio',
  SAGITTARIUS = 'sagittarius',
  CAPRICORN = 'capricorn',
  AQUARIUS = 'aquarius',
  PISCES = 'pisces',
}

// Horoscope interface
export interface Horoscope {
  id: string;
  sign: ZodiacSign;
  date: string;
  prediction: string;
  compatibility: string;
  mood: string;
  color: string;
  luckyNumber: string;
  luckyTime: string;
}

/**
 * Get horoscope for a specific sign and date
 */
export const getHoroscope = async (
  sign: ZodiacSign,
  date: string
): Promise<Horoscope> => {
  try {
    // Check cache first
    const cacheKey = `horoscope:${sign}:${date}`;
    const cachedHoroscope = await redis.get(cacheKey);
    
    if (cachedHoroscope) {
      return JSON.parse(cachedHoroscope);
    }
    
    // Check database
    const { data: dbHoroscope, error: dbError } = await supabase
      .from('horoscopes')
      .select('*')
      .eq('sign', sign)
      .eq('date', date)
      .single();
      
    if (dbHoroscope && !dbError) {
      // Cache for 24 hours
      await redis.set(cacheKey, JSON.stringify(dbHoroscope), 'EX', 86400);
      return dbHoroscope as Horoscope;
    }
    
    // Fetch from external API if not in database
    const horoscope = await fetchHoroscopeFromAPI(sign, date);
    
    // Save to database
    const { error: insertError } = await supabase
      .from('horoscopes')
      .insert({
        id: `${sign}_${date}`,
        sign,
        date,
        prediction: horoscope.prediction,
        compatibility: horoscope.compatibility,
        mood: horoscope.mood,
        color: horoscope.color,
        lucky_number: horoscope.luckyNumber,
        lucky_time: horoscope.luckyTime,
      });
      
    if (insertError) {
      logger.error('Error saving horoscope to database:', insertError);
    }
    
    // Cache for 24 hours
    await redis.set(cacheKey, JSON.stringify(horoscope), 'EX', 86400);
    
    return horoscope;
  } catch (error) {
    logger.error('Error getting horoscope:', error);
    throw new ApiError(500, 'Failed to get horoscope');
  }
};

/**
 * Fetch horoscope from external API
 * This is a placeholder for the actual API integration
 */
const fetchHoroscopeFromAPI = async (
  sign: ZodiacSign,
  date: string
): Promise<Horoscope> => {
  try {
    // In a real implementation, you would call an external API
    // This is a simplified version for demonstration
    
    if (!config.astroEngineUrl || !config.astroEngineKey) {
      throw new Error('Astro Engine API configuration missing');
    }
    
    // Make API request
    const response = await axios.get(`${config.astroEngineUrl}/horoscope`, {
      params: {
        sign,
        date,
      },
      headers: {
        'X-API-Key': config.astroEngineKey,
      },
    });
    
    if (response.status !== 200) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    // Transform API response to our format
    return {
      id: `${sign}_${date}`,
      sign,
      date,
      prediction: response.data.horoscope || generateFallbackHoroscope(sign),
      compatibility: response.data.compatibility || getRandomCompatibility(),
      mood: response.data.mood || getRandomMood(),
      color: response.data.color || getRandomColor(),
      luckyNumber: response.data.lucky_number || getRandomNumber(1, 99).toString(),
      luckyTime: response.data.lucky_time || getRandomTime(),
    };
  } catch (error) {
    logger.error('Error fetching horoscope from API:', error);
    
    // Return fallback horoscope if API fails
    return {
      id: `${sign}_${date}`,
      sign,
      date,
      prediction: generateFallbackHoroscope(sign),
      compatibility: getRandomCompatibility(),
      mood: getRandomMood(),
      color: getRandomColor(),
      luckyNumber: getRandomNumber(1, 99).toString(),
      luckyTime: getRandomTime(),
    };
  }
};

/**
 * Generate a fallback horoscope if API fails
 */
const generateFallbackHoroscope = (sign: ZodiacSign): string => {
  const horoscopes = {
    [ZodiacSign.ARIES]: 'Today is a day for new beginnings. Trust your instincts and take that first step toward your goals.',
    [ZodiacSign.TAURUS]: 'Focus on stability today. Your practical nature will help you solve a persistent problem.',
    [ZodiacSign.GEMINI]: 'Communication is key today. Express your ideas clearly and listen to others with an open mind.',
    [ZodiacSign.CANCER]: 'Your emotional intelligence is heightened today. Use it to strengthen your relationships.',
    [ZodiacSign.LEO]: 'Your creative energy is at its peak. Share your vision with others and inspire those around you.',
    [ZodiacSign.VIRGO]: 'Details matter today. Your analytical skills will help you find solutions others have missed.',
    [ZodiacSign.LIBRA]: 'Seek balance in all things today. Your diplomatic skills will be needed to resolve a conflict.',
    [ZodiacSign.SCORPIO]: 'Trust your intuition today. Your perceptive nature reveals truths beneath the surface.',
    [ZodiacSign.SAGITTARIUS]: 'Adventure calls today. Explore new ideas and expand your horizons.',
    [ZodiacSign.CAPRICORN]: 'Focus on your goals today. Your determination will overcome any obstacles.',
    [ZodiacSign.AQUARIUS]: 'Innovation is your strength today. Think outside the box to solve a challenging problem.',
    [ZodiacSign.PISCES]: 'Your compassion makes a difference today. Connect with others on a deeper level.',
  };
  
  return horoscopes[sign] || 'Today holds potential for growth and new opportunities. Stay open to possibilities.';
};

/**
 * Get random compatibility sign
 */
const getRandomCompatibility = (): string => {
  const signs = Object.values(ZodiacSign);
  return signs[Math.floor(Math.random() * signs.length)];
};

/**
 * Get random mood
 */
const getRandomMood = (): string => {
  const moods = ['Happy', 'Reflective', 'Energetic', 'Calm', 'Creative', 'Focused', 'Relaxed', 'Inspired'];
  return moods[Math.floor(Math.random() * moods.length)];
};

/**
 * Get random color
 */
const getRandomColor = (): string => {
  const colors = ['Blue', 'Green', 'Red', 'Purple', 'Yellow', 'Orange', 'Pink', 'Teal', 'Gold', 'Silver'];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Get random number in range
 */
const getRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Get random time
 */
const getRandomTime = (): string => {
  const hour = getRandomNumber(1, 12);
  const minute = getRandomNumber(0, 59);
  const period = Math.random() > 0.5 ? 'AM' : 'PM';
  return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
};
