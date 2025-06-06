import { Router } from 'express';
import { 
  register,
  login,
  refreshToken,
  logout,
  resetPassword,
  requestPasswordReset,
  verifyEmail
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);

// Protected routes
router.post('/logout', authenticate, logout);

export default router;
