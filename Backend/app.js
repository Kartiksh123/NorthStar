import express from 'express';
import authRoutes from './routes/authRoutes.js';
import datasetRoutes from './routes/datasetRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';
import queryRoutes from './routes/queryRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';

const app = express();

// Parse incoming JSON request bodies so controllers can read req.body.
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/query', queryRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

export default app;
