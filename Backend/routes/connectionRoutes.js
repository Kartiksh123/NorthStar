import { Router } from 'express';
import {
  createConnection,
  inspectConnectionSchema,
  listUserConnections,
} from '../controllers/connectionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.post('/', createConnection);
router.get('/', listUserConnections);
router.get('/:connectionId/schema', inspectConnectionSchema);

export default router;
