import path from 'node:path';
import multer from 'multer';

const allowedExtensions = new Set(['.csv', '.json', '.xlsx']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 1,
    parts: 2,
  },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      const error = new Error('Supported file types are CSV, JSON, and XLSX.');
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

export default upload;
