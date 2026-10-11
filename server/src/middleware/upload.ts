import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Supported file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/tiff',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/msword', // DOC
  'text/plain',
];

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Configure multer storage
const storage = multer.memoryStorage();

// Configure multer
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: multer.FileFilterCallback
  ) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error(`File type ${file.mimetype} is not supported`));
    }
  },
});

// Middleware to handle file upload errors
export function handleUploadError(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds maximum limit of 50MB',
        },
      });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_UPLOAD',
          message: 'Unexpected file field',
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message,
        },
      });
    }
  } else if (err) {
    res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message,
      },
    });
  } else {
    next();
  }
}

// Export multer middleware
export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10);
