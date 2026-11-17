import multer from 'multer';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: 'The uploaded file is invalid or too large.' });
  }

  const status = error.statusCode || 500;
  const message = status < 500 ? error.message : 'An unexpected server error occurred.';
  return res.status(status).json({ message });
}
