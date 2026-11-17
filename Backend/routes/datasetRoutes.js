import { Router } from 'express';
import upload from '../config/upload.js';
import {
  getDataset,
  listDatasets,
  previewDataset,
  uploadDataset,
} from '../controllers/datasetController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.post('/upload', upload.single('file'), uploadDataset);
router.get('/', listDatasets);
router.get('/:datasetId/rows', previewDataset);
router.get('/:datasetId', getDataset);

export default router;
