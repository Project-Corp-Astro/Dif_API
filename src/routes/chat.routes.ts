import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { 
  getChatHistory,
  sendMessage,
  markMessagesAsRead,
  deleteMessages
} from '../controllers/chat.controller';

const router = Router();

// Get chat history
router.get('/history', authenticate, getChatHistory);

// Send a new message
router.post('/message', authenticate, sendMessage);

// Mark messages as read
router.post('/read', authenticate, markMessagesAsRead);

// Delete messages
router.delete('/messages', authenticate, deleteMessages);

export default router;
