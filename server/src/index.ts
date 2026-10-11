import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import transcriptRoutes from './routes/transcripts.js';
import processingRoutes from './routes/processing.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Evalua backend server is running' });
});

// API routes
app.get('/api/v1', (_req, res) => {
  res.json({
    message: 'Evalua API v1',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      transcripts: {
        upload: 'POST /api/v1/transcripts/upload',
        status: 'GET /api/v1/transcripts/:jobId/status',
        results: 'GET /api/v1/transcripts/:jobId/results',
      },
      processing: {
        status: 'GET /api/v1/processing/:jobId',
      },
    },
  });
});

// Mount route handlers
app.use('/api/v1/transcripts', transcriptRoutes);
app.use('/api/v1/processing', processingRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Evalua backend server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API info: http://localhost:${PORT}/api/v1`);
});
