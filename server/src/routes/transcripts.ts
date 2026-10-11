import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDocumentStorage } from '../storage/documentStorage.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';

const router = Router();

/**
 * POST /api/v1/transcripts/upload
 * Upload transcript file and initiate processing
 */
router.post('/upload', uploadSingle, handleUploadError, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
        },
      });
      return;
    }

    const storage = getDocumentStorage();

    // Store document
    const storedDoc = await storage.storeDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Create job ID
    const jobId = uuidv4();

    // TODO: Create database record for document and processing job
    // TODO: Enqueue ingestion job
    // For now, return mock response

    res.status(200).json({
      success: true,
      data: {
        jobId,
        documentId: storedDoc.documentId,
        status: 'pending',
        estimatedDuration: 300, // 5 minutes in seconds
      },
      error: null,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/v1/transcripts/:jobId/status
 * Get processing job status
 */
router.get('/:jobId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    // TODO: Query database for job status
    // For now, return mock response

    res.status(200).json({
      success: true,
      data: {
        jobId,
        status: 'pending',
        currentStage: 'ingestion',
        progress: 0,
        startedAt: null,
        estimatedCompletion: null,
        stages: [
          {
            name: 'ingestion',
            status: 'pending',
            duration: null,
          },
          {
            name: 'ocr',
            status: 'pending',
            duration: null,
          },
          {
            name: 'extraction',
            status: 'pending',
            duration: null,
          },
        ],
      },
      error: null,
    });
  } catch (error) {
    console.error('Status query error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_QUERY_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/v1/transcripts/:jobId/results
 * Get processing results (when complete)
 */
router.get('/:jobId/results', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // TODO: Query database for results
    // For now, return mock response indicating not implemented

    console.log(`Results requested for job: ${jobId}`);

    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Results endpoint not yet implemented - requires database',
      },
    });
  } catch (error) {
    console.error('Results query error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESULTS_QUERY_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export default router;
