import { Router } from 'express';
import { createMagnetTorrent, createTorrentFromFile, getTorrentDetails, listAllTorrents, pauseTorrentDownload, removeTorrent, resumeTorrentDownload, updateTorrentFilePreferenceSettings } from '../controllers/torrent.controller.js';
import { torrentUploadMiddleware } from '../middleware/upload.middleware.js';

const router = Router();

router.get('/', listAllTorrents);
router.get('/:id', getTorrentDetails);
router.post('/magnet', createMagnetTorrent);
router.post('/file', torrentUploadMiddleware.single('torrent'), createTorrentFromFile);
router.patch('/:id/files/:fileId', updateTorrentFilePreferenceSettings);
router.post('/:id/pause', pauseTorrentDownload);
router.post('/:id/resume', resumeTorrentDownload);
router.delete('/:id', removeTorrent);

export default router;
