import fs from 'fs-extra';
import path from 'node:path';
import { getDb, updateDb } from './db.service.js';
import { getConfig } from './config.service.js';
import {
  buildSubtitleLabel,
  getSubtitleFormat,
  getSubtitleLanguageCode,
  isSubtitleFile,
  normaliseTorrentFilePath,
  normalizeStoredFileRecord
} from '../utils/file.utils.js';
import { resolveSafePath, sanitizeFilename } from '../utils/path.utils.js';

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isAdminUser(user) {
  return user?.role === 'admin';
}

function canAccessTorrentRecord(torrent, user) {
  if (!torrent || !user) {
    return false;
  }

  return isAdminUser(user) || (torrent.ownerUserId && torrent.ownerUserId === user.id);
}

function getNormalizedTorrentFiles(torrent) {
  return (torrent.files || []).map((file) => normalizeStoredFileRecord(file, {
    torrentStatus: torrent?.status
  }));
}

function getAvailableTorrentFiles(torrent) {
  return getNormalizedTorrentFiles(torrent).filter((file) => file.wanted !== false && file.isAvailable);
}

function buildMediaLibraryEntries(torrents = []) {
  return torrents.flatMap((torrent) =>
    getAvailableTorrentFiles(torrent).map((file) => ({
      id: file.id,
      torrentId: torrent.id,
      torrentName: torrent.name,
      name: file.name,
      path: file.path,
      size: file.size,
      mimeType: file.mimeType,
      isVideo: file.isVideo,
      isPlayable: file.isPlayable
    }))
  );
}

function normalizeDirectoryPath(directoryPath = '') {
  const nextPath = String(directoryPath || '').trim();

  if (!nextPath || nextPath === '.') {
    return '';
  }

  const normalizedPath = normaliseTorrentFilePath(nextPath);
  return normalizedPath === '.' ? '' : normalizedPath;
}

function normalizeStemMatchValue(value = '') {
  return value.toLowerCase().replace(/[\s._-]+/g, ' ').trim();
}

function buildVideoStemVariants(fileName = '') {
  const normalizedStem = normalizeStemMatchValue(path.posix.basename(fileName, path.posix.extname(fileName)));
  const yearlessStem = normalizedStem.replace(/\b(19|20)\d{2}\b/g, ' ').replace(/\s+/g, ' ').trim();

  return [...new Set([normalizedStem, yearlessStem].filter(Boolean))];
}

function isStrongSubtitleMatch(videoName, candidateName) {
  const candidateStem = normalizeStemMatchValue(path.posix.basename(candidateName, path.posix.extname(candidateName)));
  const variants = buildVideoStemVariants(videoName);

  return variants.some((variant) =>
    candidateStem === variant || candidateStem.startsWith(`${variant} `)
  );
}

function isSubtitleAssociatedWithVideo({
  videoFile,
  candidateName,
  candidatePath,
  siblingVideoCount,
  totalVideoCount
}) {
  if (isStrongSubtitleMatch(videoFile.name, candidateName)) {
    return true;
  }

  if (path.posix.dirname(candidatePath) === path.posix.dirname(videoFile.path) && siblingVideoCount <= 1) {
    return true;
  }

  return totalVideoCount <= 1;
}

function encodeSubtitleId(relativePath = '') {
  return Buffer.from(normaliseTorrentFilePath(relativePath), 'utf8').toString('base64url');
}

function decodeSubtitleId(subtitleId = '') {
  try {
    return normaliseTorrentFilePath(Buffer.from(String(subtitleId), 'base64url').toString('utf8'));
  } catch (_error) {
    throw createHttpError('Subtitle not found', 404);
  }
}

function ensureVideoFileSupportsSubtitles(file) {
  if (!file.isVideo) {
    throw createHttpError('Subtitles are only supported for video files', 400);
  }
}

async function getTorrentById(torrentId, { user } = {}) {
  const database = getDb();
  await database.read();
  const torrent = database.data.torrents.find((item) => item.id === torrentId);

  if (!torrent || (user && !canAccessTorrentRecord(torrent, user))) {
    throw createHttpError('Torrent not found', 404);
  }

  return torrent;
}

async function listDirectorySubtitleCandidates(downloadDir, absoluteVideoPath) {
  const subtitleDirectory = path.dirname(absoluteVideoPath);
  const entries = await fs.readdir(subtitleDirectory);

  return entries
    .filter((entry) => isSubtitleFile(entry))
    .map((entry) => {
      const absolutePath = path.join(subtitleDirectory, entry);
      return {
        name: entry,
        path: normaliseTorrentFilePath(path.relative(downloadDir, absolutePath)),
        source: 'uploaded'
      };
    });
}

async function buildSubtitleTrackList(torrent, videoFile, absoluteVideoPath) {
  ensureVideoFileSupportsSubtitles(videoFile);

  const { downloadDir } = getConfig();
  const availableFiles = getAvailableTorrentFiles(torrent);
  const availableVideoFiles = availableFiles.filter((candidate) => candidate.isVideo);
  const siblingVideoCount = availableVideoFiles.filter((candidate) =>
    path.posix.dirname(candidate.path) === path.posix.dirname(videoFile.path)
  ).length || 1;
  const candidateMap = new Map();

  for (const candidate of availableFiles) {
    if (!isSubtitleFile(candidate.name) || candidate.path === videoFile.path) {
      continue;
    }

    if (!isSubtitleAssociatedWithVideo({
      videoFile,
      candidateName: candidate.name,
      candidatePath: candidate.path,
      siblingVideoCount,
      totalVideoCount: availableVideoFiles.length
    })) {
      continue;
    }

    candidateMap.set(candidate.path, {
      name: candidate.name,
      path: candidate.path,
      source: 'torrent'
    });
  }

  for (const candidate of await listDirectorySubtitleCandidates(downloadDir, absoluteVideoPath)) {
    if (candidate.path === videoFile.path || candidateMap.has(candidate.path)) {
      continue;
    }

    if (!isSubtitleAssociatedWithVideo({
      videoFile,
      candidateName: candidate.name,
      candidatePath: candidate.path,
      siblingVideoCount,
      totalVideoCount: availableVideoFiles.length
    })) {
      continue;
    }

    candidateMap.set(candidate.path, candidate);
  }

  const subtitleTracks = [];

  for (const candidate of candidateMap.values()) {
    const absolutePath = resolveSafePath(downloadDir, candidate.path);
    if (!await fs.pathExists(absolutePath)) {
      continue;
    }

    subtitleTracks.push({
      id: encodeSubtitleId(candidate.path),
      name: candidate.name,
      label: buildSubtitleLabel(candidate.name, videoFile.name),
      language: getSubtitleLanguageCode(candidate.name, videoFile.name),
      format: getSubtitleFormat(candidate.name),
      source: candidate.source
    });
  }

  return subtitleTracks.sort((left, right) =>
    left.label.localeCompare(right.label) || left.name.localeCompare(right.name)
  );
}

function normalizeTextForWebVtt(rawText = '') {
  return String(rawText)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function toWebVtt(rawText = '', format = 'vtt') {
  const normalizedText = normalizeTextForWebVtt(rawText);
  const webVttBody = format === 'srt'
    ? normalizedText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    : normalizedText;

  if (!webVttBody) {
    return 'WEBVTT\n';
  }

  return webVttBody.startsWith('WEBVTT')
    ? `${webVttBody}\n`
    : `WEBVTT\n\n${webVttBody}\n`;
}

function buildUploadedSubtitleDescriptor(originalName = '', videoName = '') {
  const originalStem = normalizeStemMatchValue(path.parse(originalName).name);

  for (const variant of buildVideoStemVariants(videoName)) {
    if (originalStem === variant) {
      return 'subtitle';
    }

    if (originalStem.startsWith(`${variant} `)) {
      return originalStem.slice(variant.length).trim() || 'subtitle';
    }
  }

  return originalStem || 'subtitle';
}

function slugifySubtitleDescriptor(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '') || 'subtitle';
}

export async function syncMediaLibrary() {
  const database = getDb();
  await database.read();
  const media = buildMediaLibraryEntries(database.data.torrents);

  database.data.media = media;
  await database.write();
  return media;
}

export async function listMedia({ user } = {}) {
  const database = getDb();
  await database.read();
  return buildMediaLibraryEntries(
    database.data.torrents.filter((torrent) => !user || canAccessTorrentRecord(torrent, user))
  );
}

export async function getTorrentMediaFiles(torrentId, { user } = {}) {
  const torrent = await getTorrentById(torrentId, { user });
  return getAvailableTorrentFiles(torrent);
}

export async function getMediaFile(torrentId, fileId, { user } = {}) {
  const torrent = await getTorrentById(torrentId, { user });
  const file = getAvailableTorrentFiles(torrent).find((item) => item.id === fileId);

  if (!file) {
    throw createHttpError('File not found', 404);
  }

  const { downloadDir } = getConfig();
  const absolutePath = resolveSafePath(downloadDir, file.path);
  const exists = await fs.pathExists(absolutePath);

  if (!exists) {
    throw createHttpError('File does not exist on disk', 404);
  }

  return {
    torrent,
    file,
    absolutePath
  };
}

export async function getMediaSubtitleTracks(torrentId, fileId, { user } = {}) {
  const { torrent, file, absolutePath } = await getMediaFile(torrentId, fileId, { user });
  return buildSubtitleTrackList(torrent, file, absolutePath);
}

export async function getMediaSubtitleTrack(torrentId, fileId, subtitleId, { user } = {}) {
  const { downloadDir } = getConfig();
  const subtitleTracks = await getMediaSubtitleTracks(torrentId, fileId, { user });
  const subtitle = subtitleTracks.find((track) => track.id === subtitleId);

  if (!subtitle) {
    throw createHttpError('Subtitle not found', 404);
  }

  const absolutePath = resolveSafePath(downloadDir, decodeSubtitleId(subtitle.id));
  const exists = await fs.pathExists(absolutePath);

  if (!exists) {
    throw createHttpError('Subtitle file does not exist on disk', 404);
  }

  return {
    subtitle,
    content: toWebVtt(await fs.readFile(absolutePath, 'utf8'), subtitle.format)
  };
}

export async function uploadMediaSubtitle(torrentId, fileId, uploadedFile, { user } = {}) {
  if (!uploadedFile?.path) {
    throw createHttpError('A subtitle file is required', 400);
  }

  const { torrent, file, absolutePath } = await getMediaFile(torrentId, fileId, { user });
  ensureVideoFileSupportsSubtitles(file);

  if (!isSubtitleFile(uploadedFile.originalname)) {
    throw createHttpError('Only .srt, .vtt, and .webvtt subtitle files are allowed', 400);
  }

  const videoDirectory = path.dirname(absolutePath);
  const videoStem = sanitizeFilename(path.parse(file.name).name) || 'video';
  const extension = path.extname(uploadedFile.originalname).toLowerCase();
  const descriptor = slugifySubtitleDescriptor(
    buildUploadedSubtitleDescriptor(uploadedFile.originalname, file.name)
  );

  let suffix = 0;
  let targetPath = '';

  try {
    do {
      const candidateName = suffix === 0
        ? `${videoStem}.${descriptor}${extension}`
        : `${videoStem}.${descriptor}-${suffix + 1}${extension}`;
      targetPath = path.join(videoDirectory, candidateName);
      suffix += 1;
    } while (await fs.pathExists(targetPath));

    await fs.move(uploadedFile.path, targetPath);
  } finally {
    if (await fs.pathExists(uploadedFile.path)) {
      await fs.remove(uploadedFile.path);
    }
  }

  const subtitlePath = normaliseTorrentFilePath(path.relative(getConfig().downloadDir, targetPath));
  const subtitles = await buildSubtitleTrackList(torrent, file, absolutePath);
  const subtitle = subtitles.find((track) => track.id === encodeSubtitleId(subtitlePath));

  if (!subtitle) {
    throw createHttpError('Uploaded subtitle could not be loaded', 500);
  }

  return {
    subtitle,
    subtitles
  };
}

export async function getMediaDirectoryArchive(torrentId, directoryPath = '', { user } = {}) {
  const torrent = await getTorrentById(torrentId, { user });
  const safeDirectoryPath = normalizeDirectoryPath(directoryPath);
  const pathPrefix = safeDirectoryPath ? `${safeDirectoryPath}/` : '';
  const matchingFiles = getAvailableTorrentFiles(torrent).filter((file) =>
    safeDirectoryPath ? file.path.startsWith(pathPrefix) : true
  );

  if (!matchingFiles.length) {
    throw createHttpError('Folder not found', 404);
  }

  const { downloadDir } = getConfig();
  const archiveRootName = sanitizeFilename(
    safeDirectoryPath ? path.posix.basename(safeDirectoryPath) : (torrent.name || 'download')
  ) || 'download';
  const files = [];

  for (const file of matchingFiles) {
    const absolutePath = resolveSafePath(downloadDir, file.path);
    if (!await fs.pathExists(absolutePath)) {
      continue;
    }

    const relativeArchivePath = safeDirectoryPath
      ? path.posix.relative(safeDirectoryPath, file.path)
      : file.path;

    files.push({
      absolutePath,
      archivePath: path.posix.join(archiveRootName, relativeArchivePath)
    });
  }

  if (!files.length) {
    throw createHttpError('Folder does not exist on disk', 404);
  }

  return {
    archiveName: `${archiveRootName}.zip`,
    files
  };
}

export async function deleteTorrentFiles(fileRecords = []) {
  const { downloadDir } = getConfig();
  const candidateDirectories = new Set();

  for (const fileRecord of fileRecords) {
    const absolutePath = resolveSafePath(downloadDir, fileRecord.path);
    if (await fs.pathExists(absolutePath)) {
      await fs.remove(absolutePath);
      candidateDirectories.add(path.dirname(absolutePath));
    }
  }

  for (const directory of candidateDirectories) {
    if (directory !== downloadDir && await fs.pathExists(directory)) {
      const remainingEntries = await fs.readdir(directory);
      if (remainingEntries.length === 0) {
        await fs.remove(directory);
      }
    }
  }
}

export async function renameMediaFileMetadata(torrentId, fileId, nextName) {
  const safeName = sanitizeFilename(nextName);

  await updateDb((data) => {
    const torrent = data.torrents.find((item) => item.id === torrentId);
    if (!torrent) {
      throw createHttpError('Torrent not found', 404);
    }

    const file = (torrent.files || []).find((item) => item.id === fileId);
    if (!file) {
      throw createHttpError('File not found', 404);
    }

    file.name = safeName;
  });

  await syncMediaLibrary();
}
