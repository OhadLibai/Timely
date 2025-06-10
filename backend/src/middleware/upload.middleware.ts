// timely/backend/src/middleware/upload.middleware.ts
import multer from 'multer';

// Using memory storage is often sufficient if you process the file immediately
// and upload it to a cloud service. For saving directly to disk, use multer.diskStorage.
const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Basic image file filter
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.') as any, false);
    }
  },
});