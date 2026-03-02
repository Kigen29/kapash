import { Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import prisma from '../config/database';
import { uploadMultipleImages, deleteImage } from '../services/upload.service';
import { AppError } from '../utils/errors';

export async function uploadPitchImages(req: AuthRequest, res: Response) {
  const { id: pitchId } = req.params;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) throw new AppError('No images provided.', 400);

  const pitch = await prisma.pitch.findUnique({ where: { id: pitchId } });
  if (!pitch) throw new AppError('Pitch not found.', 404);
  if (pitch.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new AppError('Not your pitch.', 403);
  }

  // Upload to Cloudinary
  const results = await uploadMultipleImages(files, `pitches/${pitchId}`);

  // Get current image count to set order
  const currentCount = await prisma.pitchImage.count({ where: { pitchId } });

  const images = await prisma.$transaction(
    results.map((result, i) =>
      prisma.pitchImage.create({
        data: {
          pitchId,
          url: result.url,
          publicId: result.publicId,
          isPrimary: currentCount === 0 && i === 0,
          order: currentCount + i,
        },
      })
    )
  );

  res.status(201).json({ success: true, data: images });
}

export async function deletePitchImage(req: AuthRequest, res: Response) {
  const { id: pitchId, imageId } = req.params;

  const image = await prisma.pitchImage.findUnique({
    where: { id: imageId },
    include: { pitch: true },
  });

  if (!image) throw new AppError('Image not found.', 404);
  if (image.pitch.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new AppError('Not your pitch.', 403);
  }

  // Delete from Cloudinary
  await deleteImage(image.publicId);

  // Delete from DB
  await prisma.pitchImage.delete({ where: { id: imageId } });

  // If deleted was primary, make next image primary
  if (image.isPrimary) {
    const nextImage = await prisma.pitchImage.findFirst({
      where: { pitchId },
      orderBy: { order: 'asc' },
    });
    if (nextImage) {
      await prisma.pitchImage.update({
        where: { id: nextImage.id },
        data: { isPrimary: true },
      });
    }
  }

  res.json({ success: true, message: 'Image deleted.' });
}