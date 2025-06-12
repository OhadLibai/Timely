// backend/src/services/upload.service.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    // Ensure upload directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter for images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Upload single image
export const uploadImage = async (file: Express.Multer.File): Promise<string> => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Return the relative path to the uploaded file
    const relativePath = `/uploads/${file.filename}`;
    logger.info(`Image uploaded successfully: ${relativePath}`);
    
    return relativePath;
  } catch (error) {
    logger.error('Error uploading image:', error);
    throw error;
  }
};

// Delete uploaded file
export const deleteUploadedFile = async (filename: string): Promise<void> => {
  try {
    const filePath = path.join(__dirname, '../../uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`File deleted successfully: ${filename}`);
    }
  } catch (error) {
    logger.error('Error deleting file:', error);
    throw error;
  }
};