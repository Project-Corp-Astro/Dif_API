import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { 
  validateSubscription,
  syncSubscription,
  getSubscriptionStatus,
  handleWebhook
} from '../controllers/subscription.controller';

const router = Router();

// Get current subscription status
router.get('/status', authenticate, getSubscriptionStatus);

// Validate receipt and update subscription
router.post('/validate', authenticate, validateSubscription);

// Sync subscription status with store
router.post('/sync', authenticate, syncSubscription);

// Webhook for store notifications (Apple/Google)
router.post('/webhook', handleWebhook);

export default router;
