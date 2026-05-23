import fs from 'node:fs';
import { ZipArchive } from 'archiver';
import {
  getMediaDirectoryArchive,
  getMediaFile,
  getMediaSubtitleTrack,
  getMediaSubtitleTracks,
  getTorrentMediaFiles,
  listMedia,
  uploadMediaSubtitle
} from '../services/media.service.js';

export async function getMediaLibrary(request, response, next) {
  try {
    const media = await listMedia({ user: request.user });
    response.json({ success: true, data: media });
  } catch (error) {
    next(error);
  }
}

export async function getMediaFiles(request, response, next) {
  try {
    const files = await getTorrentMediaFiles(request.params.torrentId, { user: request.user });
    response.json({ success: true, data: files });
  } catch (error) {
    next(error);
  }
}

export async function getMediaSubtitles(request, response, next) {
  try {
    const subtitles = await getMediaSubtitleTracks(request.params.torrentId, request.params.fileId, { user: request.user });
    response.json({ success: true, data: subtitles });
  } catch (error) {
    next(error);
  }
}

export async function streamMediaFile(request, response, next) {
  try {
    const { file, absolutePath } = await getMediaFile(request.params.torrentId, request.params.fileId, {
      user: request.user
    });

    if (!file.isVideo) {
      response.status(400).json({
        success: false,
        message: 'Only video files can be streamed'
      });
      return;
    }

    const stat = await fs.promises.stat(absolutePath);
    const rangeHeader = request.headers.range;
    const contentType = file.mimeType || 'application/octet-stream';

    if (rangeHeader) {
      const matchedRange = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
      if (!matchedRange) {
        response.status(416).json({ success: false, message: 'Invalid range header' });
        return;
      }

      const start = Number.parseInt(matchedRange[1], 10);
      const end = matchedRange[2] ? Number.parseInt(matchedRange[2], 10) : stat.size - 1;

      if (start >= stat.size || end >= stat.size) {
        response.status(416).json({ success: false, message: 'Requested range is not satisfiable' });
        return;
      }

      response.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': contentType
      });

      fs.createReadStream(absolutePath, { start, end }).pipe(response);
      return;
    }

    response.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    });

    fs.createReadStream(absolutePath).pipe(response);
  } catch (error) {
    next(error);
  }
}

export async function streamMediaSubtitle(request, response, next) {
  try {
    const { subtitle, content } = await getMediaSubtitleTrack(
      request.params.torrentId,
      request.params.fileId,
      request.params.subtitleId,
      { user: request.user }
    );

    response.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(`${subtitle.name.replace(/\.[^.]+$/, '') || 'subtitle'}.vtt`)}"`
    );
    response.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    response.send(content);
  } catch (error) {
    next(error);
  }
}

export async function downloadMediaFile(request, response, next) {
  try {
    const { file, absolutePath } = await getMediaFile(request.params.torrentId, request.params.fileId, {
      user: request.user
    });
    response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    response.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    fs.createReadStream(absolutePath).pipe(response);
  } catch (error) {
    next(error);
  }
}

export async function createMediaSubtitle(request, response, next) {
  try {
    if (!request.file) {
      response.status(400).json({
        success: false,
        message: 'A subtitle file is required'
      });
      return;
    }

    const subtitleData = await uploadMediaSubtitle(request.params.torrentId, request.params.fileId, request.file, {
      user: request.user
    });
    response.status(201).json({ success: true, data: subtitleData });
  } catch (error) {
    next(error);
  }
}

export async function downloadMediaDirectory(request, response, next) {
  try {
    const { archiveName, files } = await getMediaDirectoryArchive(
      request.params.torrentId,
      request.query.path,
      { user: request.user }
    );
    const archive = new ZipArchive({
      zlib: { level: 9 }
    });

    archive.on('error', (error) => {
      if (!response.headersSent) {
        next(error);
        return;
      }

      response.destroy(error);
    });

    response.on('close', () => {
      if (!response.writableEnded) {
        archive.abort();
      }
    });

    response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(archiveName)}"`);
    response.setHeader('Content-Type', 'application/zip');

    archive.pipe(response);

    for (const file of files) {
      archive.file(file.absolutePath, { name: file.archivePath });
    }

    await archive.finalize();
  } catch (error) {
    next(error);
  }
}
