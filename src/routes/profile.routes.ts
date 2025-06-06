import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import { 
  getProfile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  updatePreferences
} from '../controllers/profile.controller';

const router = Router();

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// All routes require authentication
router.use(authenticate);

// Get user profile
router.get('/', getProfile);

// Update user profile
router.put('/', updateProfile);

// Upload avatar
router.post('/avatar', upload.single('avatar'), uploadAvatar);

// Delete avatar
router.delete('/avatar', removeAvatar);

// Update preferences
router.put('/preferences', updatePreferences);

export default router;
