import { Router } from 'express';
import {
  createMediaSubtitle,
  downloadMediaDirectory,
  downloadMediaFile,
  getMediaFiles,
  getMediaLibrary,
  getMediaSubtitles,
  streamMediaSubtitle,
  streamMediaFile
} from '../controllers/media.controller.js';
import { subtitleUploadMiddleware } from '../middleware/upload.middleware.js';

const router = Router();

router.get('/', getMediaLibrary);
router.get('/:torrentId/files', getMediaFiles);
router.get('/:torrentId/folders/download', downloadMediaDirectory);
router.get('/:torrentId/files/:fileId/subtitles', getMediaSubtitles);
router.post('/:torrentId/files/:fileId/subtitles', subtitleUploadMiddleware.single('subtitle'), createMediaSubtitle);
router.get('/:torrentId/files/:fileId/subtitles/:subtitleId', streamMediaSubtitle);
router.get('/:torrentId/files/:fileId/stream', streamMediaFile);
router.get('/:torrentId/files/:fileId/download', downloadMediaFile);

export default router;
