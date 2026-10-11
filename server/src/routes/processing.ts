import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/v1/processing/:jobId
 * Get processing job status (alternative endpoint)
 */
router.get('/:jobId', async (req: Request, res: Response): Promise<void> => {
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
    console.error('Processing status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_QUERY_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export default router;
