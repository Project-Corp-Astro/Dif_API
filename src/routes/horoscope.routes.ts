import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { 
  getDailyHoroscope,
  getAllHoroscopes,
  getPersonalHoroscope
} from '../controllers/horoscope.controller';

const router = Router();

// Public routes
router.get('/daily/:sign/:date', getDailyHoroscope);
router.get('/all/:date', getAllHoroscopes);

// Protected routes
router.get('/personal/:date', authenticate, getPersonalHoroscope);

export default router;
