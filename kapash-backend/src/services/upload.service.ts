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

// Dev fallback when Cloudinary credentials aren't configured.
// Returns a deterministic Unsplash placeholder so the pitch creation flow stays unblocked.
const DEV_PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=1200',
  'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1200',
  'https://images.unsplash.com/photo-1487466365202-1afdb86c764e?w=1200',
];

function isCloudinaryConfigured() {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  return !!name && name !== 'placeholder' && name !== 'your_cloud_name';
}

export async function uploadImage(
  buffer: Buffer,
  folder: string,
  filename?: string
): Promise<UploadResult> {
  // Dev fallback — return a placeholder so pitch creation isn't blocked by missing creds
  if (!isCloudinaryConfigured()) {
    logger.warn('Cloudinary not configured — returning placeholder image URL.');
    const url = DEV_PLACEHOLDERS[Math.floor(Math.random() * DEV_PLACEHOLDERS.length)];
    return {
      url,
      publicId: `dev-placeholder-${Date.now()}`,
      width: 1200,
      height: 800,
    };
  }

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