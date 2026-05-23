import { addMagnetTorrent, addTorrentFile, deleteTorrent, getTorrentById, listTorrents, pauseTorrent, resumeTorrent, updateTorrentFilePreferences } from '../services/torrent.service.js';
import { isValidFilePriority, isValidMagnetURI, normaliseFilePriority, toBoolean } from '../utils/validation.utils.js';

export async function listAllTorrents(_request, response, next) {
  try {
    const torrents = await listTorrents({ user: _request.user });
    response.json({ success: true, data: torrents });
  } catch (error) {
    next(error);
  }
}

export async function getTorrentDetails(request, response, next) {
  try {
    const torrent = await getTorrentById(request.params.id, { user: request.user });
    response.json({ success: true, data: torrent });
  } catch (error) {
    next(error);
  }
}

export async function createMagnetTorrent(request, response, next) {
  try {
    const magnetURI = request.body?.magnetURI?.trim();
    if (!isValidMagnetURI(magnetURI)) {
      response.status(400).json({
        success: false,
        message: 'Invalid magnet link. It must start with magnet:?xt=urn:btih:'
      });
      return;
    }

    const torrent = await addMagnetTorrent(magnetURI, { user: request.user });
    response.status(201).json({ success: true, data: torrent });
  } catch (error) {
    next(error);
  }
}

export async function createTorrentFromFile(request, response, next) {
  try {
    if (!request.file) {
      response.status(400).json({
        success: false,
        message: 'A .torrent file is required'
      });
      return;
    }

    const torrent = await addTorrentFile(request.file, { user: request.user });
    response.status(201).json({ success: true, data: torrent });
  } catch (error) {
    next(error);
  }
}

export async function pauseTorrentDownload(request, response, next) {
  try {
    const torrent = await pauseTorrent(request.params.id, { user: request.user });
    response.json({ success: true, data: torrent });
  } catch (error) {
    next(error);
  }
}

export async function resumeTorrentDownload(request, response, next) {
  try {
    const torrent = await resumeTorrent(request.params.id, { user: request.user });
    response.json({ success: true, data: torrent });
  } catch (error) {
    next(error);
  }
}

export async function updateTorrentFilePreferenceSettings(request, response, next) {
  try {
    const { wanted, priority } = request.body || {};

    if (typeof wanted !== 'boolean' && priority === undefined) {
      response.status(400).json({
        success: false,
        message: 'Provide a boolean wanted value or a valid priority'
      });
      return;
    }

    if (priority !== undefined && !isValidFilePriority(priority)) {
      response.status(400).json({
        success: false,
        message: 'Priority must be one of: low, normal, high'
      });
      return;
    }

    const torrent = await updateTorrentFilePreferences(
      request.params.id,
      request.params.fileId,
      {
        ...(typeof wanted === 'boolean' ? { wanted } : {}),
        ...(priority !== undefined ? { priority: normaliseFilePriority(priority) } : {})
      },
      { user: request.user }
    );

    response.json({ success: true, data: torrent });
  } catch (error) {
    next(error);
  }
}

export async function removeTorrent(request, response, next) {
  try {
    await deleteTorrent(request.params.id, toBoolean(request.query.deleteFiles), { user: request.user });
    response.json({ success: true, data: { id: request.params.id } });
  } catch (error) {
    next(error);
  }
}
