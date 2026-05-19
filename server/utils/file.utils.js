import mime from 'mime-types';
import path from 'node:path';
import { sanitizeFilename, toPosixRelativePath } from './path.utils.js';

const playableVideoExtensions = new Set(['.mp4', '.webm', '.ogg', '.ogv', '.m4v']);
const knownVideoExtensions = new Set(['.mp4', '.webm', '.ogg', '.ogv', '.m4v', '.mkv', '.avi', '.mov']);
const knownSubtitleExtensions = new Set(['.srt', '.vtt', '.webvtt']);
const subtitleTokenLabels = {
  ar: 'Arabic',
  arabic: 'Arabic',
  cc: 'CC',
  de: 'German',
  deutsch: 'German',
  en: 'English',
  eng: 'English',
  english: 'English',
  es: 'Spanish',
  forced: 'Forced',
  fr: 'French',
  french: 'French',
  german: 'German',
  hi: 'Hindi',
  hindi: 'Hindi',
  it: 'Italian',
  italian: 'Italian',
  ja: 'Japanese',
  japanese: 'Japanese',
  kn: 'Kannada',
  kannada: 'Kannada',
  ko: 'Korean',
  korean: 'Korean',
  ml: 'Malayalam',
  malayalam: 'Malayalam',
  pt: 'Portuguese',
  ru: 'Russian',
  russian: 'Russian',
  sdh: 'SDH',
  spanish: 'Spanish',
  subtitles: 'Subtitles',
  ta: 'Tamil',
  tamil: 'Tamil',
  te: 'Telugu',
  telugu: 'Telugu',
  und: 'Unknown',
  zh: 'Chinese'
};
const subtitleTokenLanguageCodes = {
  ar: 'ar',
  arabic: 'ar',
  de: 'de',
  deutsch: 'de',
  en: 'en',
  eng: 'en',
  english: 'en',
  es: 'es',
  fr: 'fr',
  french: 'fr',
  german: 'de',
  hi: 'hi',
  hindi: 'hi',
  it: 'it',
  italian: 'it',
  ja: 'ja',
  japanese: 'ja',
  kn: 'kn',
  kannada: 'kn',
  ko: 'ko',
  korean: 'ko',
  ml: 'ml',
  malayalam: 'ml',
  pt: 'pt',
  ru: 'ru',
  russian: 'ru',
  spanish: 'es',
  ta: 'ta',
  tamil: 'ta',
  te: 'te',
  telugu: 'te',
  zh: 'zh'
};

function normalizeFileStem(fileName = '') {
  return path.parse(fileName).name.toLowerCase().replace(/[\s._-]+/g, ' ').trim();
}

function getSubtitleDescriptor(subtitleName = '', relatedVideoName = '') {
  const subtitleStem = normalizeFileStem(subtitleName);
  const relatedVideoStem = normalizeFileStem(relatedVideoName);

  if (!relatedVideoStem) {
    return subtitleStem;
  }

  if (subtitleStem === relatedVideoStem) {
    return '';
  }

  if (subtitleStem.startsWith(`${relatedVideoStem} `)) {
    return subtitleStem.slice(relatedVideoStem.length).trim();
  }

  return subtitleStem;
}

function formatSubtitleToken(token = '') {
  const normalizedToken = token.toLowerCase();
  if (subtitleTokenLabels[normalizedToken]) {
    return subtitleTokenLabels[normalizedToken];
  }

  return normalizedToken.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function isFileAvailable(file = {}) {
  const size = Math.max(0, Number(file.size) || 0);
  const downloaded = Math.max(0, Number(file.downloaded) || 0);
  const progress = Math.max(0, Number(file.progress) || 0);

  return size === 0 || downloaded >= size || progress >= 100;
}

export function isVideoFile(fileName = '') {
  return knownVideoExtensions.has(path.extname(fileName).toLowerCase());
}

export function isPlayableVideo(fileName = '') {
  return playableVideoExtensions.has(path.extname(fileName).toLowerCase());
}

export function isSubtitleFile(fileName = '') {
  return knownSubtitleExtensions.has(path.extname(fileName).toLowerCase());
}

export function getSubtitleFormat(fileName = '') {
  const extension = path.extname(fileName).toLowerCase();
  return extension === '.srt' ? 'srt' : 'vtt';
}

export function getSubtitleLanguageCode(fileName = '', relatedVideoName = '') {
  const descriptor = getSubtitleDescriptor(fileName, relatedVideoName);
  const tokens = descriptor.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const code = subtitleTokenLanguageCodes[token];
    if (code) {
      return code;
    }
  }

  return 'und';
}

export function buildSubtitleLabel(fileName = '', relatedVideoName = '') {
  const descriptor = getSubtitleDescriptor(fileName, relatedVideoName);
  if (!descriptor) {
    return 'Default subtitle';
  }

  return descriptor
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => formatSubtitleToken(token))
    .join(' ');
}

export function getMimeType(fileName = '') {
  return mime.lookup(fileName) || 'application/octet-stream';
}

export function normaliseTorrentFilePath(filePath = '') {
  return toPosixRelativePath(path.normalize(filePath).replace(/^[/\\]+/, ''));
}

export function buildFileRecord({ existingFile, fallbackId, name, relativePath, size, downloaded, progress }) {
  const safeName = sanitizeFilename(name);
  const fileSize = Math.max(0, Number(size) || 0);
  const fileProgress = fileSize === 0
    ? 100
    : Math.max(0, Math.min(100, Number(progress) || 0));
  const fileDownloaded = fileSize === 0
    ? 0
    : Math.max(0, Math.min(fileSize, Number(downloaded) || 0));

  const record = {
    id: existingFile?.id || fallbackId,
    name: safeName,
    path: normaliseTorrentFilePath(relativePath || safeName),
    size: fileSize,
    downloaded: fileDownloaded,
    progress: fileProgress,
    wanted: existingFile?.wanted !== false,
    priority: existingFile?.priority || 'normal',
    mimeType: getMimeType(safeName),
    isVideo: isVideoFile(safeName),
    isPlayable: isPlayableVideo(safeName)
  };

  return {
    ...record,
    isAvailable: isFileAvailable(record)
  };
}

export function normalizeStoredFileRecord(file = {}, { torrentStatus = '' } = {}) {
  const safeName = sanitizeFilename(file.name || path.posix.basename(file.path || 'file'));
  const safePath = normaliseTorrentFilePath(file.path || safeName);
  const fileSize = Math.max(0, Number(file.size) || 0);
  const hasDownloaded = Number.isFinite(Number(file.downloaded));
  const hasProgress = Number.isFinite(Number(file.progress));
  const isLegacyCompletedFile = file.wanted !== false && torrentStatus === 'completed' && !hasDownloaded && !hasProgress;
  const fileDownloaded = fileSize === 0
    ? 0
    : isLegacyCompletedFile
      ? fileSize
      : Math.max(0, Math.min(fileSize, Number(file.downloaded) || 0));
  const fileProgress = fileSize === 0
    ? 100
    : isLegacyCompletedFile
      ? 100
      : Math.max(0, Math.min(100, Number(file.progress) || 0));

  const record = {
    ...file,
    id: file.id || safePath,
    name: safeName,
    path: safePath,
    size: fileSize,
    downloaded: fileDownloaded,
    progress: fileProgress,
    wanted: file.wanted !== false,
    priority: file.priority || 'normal',
    mimeType: file.mimeType || getMimeType(safeName),
    isVideo: typeof file.isVideo === 'boolean' ? file.isVideo : isVideoFile(safeName),
    isPlayable: typeof file.isPlayable === 'boolean' ? file.isPlayable : isPlayableVideo(safeName)
  };

  return {
    ...record,
    isAvailable: file.isAvailable === true || isFileAvailable(record)
  };
}
