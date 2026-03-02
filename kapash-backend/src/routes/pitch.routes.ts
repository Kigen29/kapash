import { Router } from 'express';
import {
  searchPitches, getPitch, getPitchAvailability,
  createPitch, updatePitch,
} from '../controllers/pitch.controller';
import { authenticate, requireOwner } from '../middleware/authenticate';
import { upload } from '../services/upload.service';
import { uploadPitchImages, deletePitchImage } from '../controllers/upload.controller';

const router = Router();

// Public
router.get('/', searchPitches);
router.get('/:id', getPitch);
router.get('/:id/availability', getPitchAvailability);

// Owner only
router.post('/', authenticate, requireOwner, createPitch);
router.patch('/:id', authenticate, requireOwner, updatePitch);
router.post('/:id/images', authenticate, requireOwner, upload.array('images', 5), uploadPitchImages);
router.delete('/:id/images/:imageId', authenticate, requireOwner, deletePitchImage);

export default router;