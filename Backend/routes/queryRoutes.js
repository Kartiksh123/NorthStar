import { Router } from 'express';
import { askQuestion } from '../controllers/queryController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.post('/ask', askQuestion);

export default router;
