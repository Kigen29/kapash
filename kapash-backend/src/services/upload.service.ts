import multer from 'multer';
import cloudinary from '../config/cloudinary';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { Request } from 'express';

// ── Multer Config (memory storage — stream to Cloudinary) ─────────────────────

const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, and WebP images are allowed.', 400) as any);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5,                   // Max 5 files at once
  },
});

// ── Upload to Cloudinary ──────────────────────────────────────────────────────

interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

export async function uploadImage(
  buffer: Buffer,
  folder: string,
  filename?: string
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `kapash/${folder}`,
        public_id: filename,
        transformation: [
          { width: 1200, height: 800, crop: 'fill', gravity: 'auto' },
          { quality: 'auto:good' },
          { format: 'webp' },
        ],
        eager: [
          // Thumbnail
          { width: 400, height: 300, crop: 'fill', gravity: 'auto', quality: 'auto', format: 'webp' },
        ],
        eager_async: true,
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error:', error);
          reject(new AppError('Image upload failed.', 500));
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
          });
        }
      }
    );

    stream.end(buffer);
  });
}

// ── Delete from Cloudinary ────────────────────────────────────────────────────

export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Deleted image: ${publicId}`);
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
  }
}

// ── Upload Multiple Images ────────────────────────────────────────────────────

export async function uploadMultipleImages(
  files: Express.Multer.File[],
  folder: string
): Promise<UploadResult[]> {
  const uploads = files.map((file, index) =>
    uploadImage(file.buffer, folder, `${Date.now()}_${index}`)
  );
  return Promise.all(uploads);
}