import {
  getUserDataset,
  getUserDatasetRows,
  getUserDatasets,
  importDataset,
} from '../services/datasetService.js';

export async function uploadDataset(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Choose a file to upload.' });

  try {
    const dataset = await importDataset(req.user.userId, req.file, req.body?.name);
    return res.status(201).json({ dataset });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Could not import the file.' });
  }
}

export async function listDatasets(req, res) {
  try {
    const datasets = await getUserDatasets(req.user.userId);
    return res.json({ datasets });
  } catch {
    return res.status(500).json({ message: 'Could not load datasets.' });
  }
}

export async function getDataset(req, res) {
  try {
    const dataset = await getUserDataset(req.user.userId, req.params.datasetId);
    if (!dataset) return res.status(404).json({ message: 'Dataset not found.' });
    return res.json({ dataset });
  } catch {
    return res.status(400).json({ message: 'Could not load this dataset.' });
  }
}

export async function previewDataset(req, res) {
  try {
    const result = await getUserDatasetRows(req.user.userId, req.params.datasetId, req.query.limit);
    if (!result) return res.status(404).json({ message: 'Dataset not found.' });
    return res.json(result);
  } catch {
    return res.status(400).json({ message: 'Could not load dataset rows.' });
  }
}
