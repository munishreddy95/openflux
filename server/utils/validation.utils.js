import path from 'node:path';
import parseTorrent from 'parse-torrent';

const FILE_PRIORITY_VALUES = new Set(['low', 'normal', 'high']);

export function isValidMagnetURI(value = '') {
  return /^magnet:\?xt=urn:btih:/i.test(value.trim());
}

export function normaliseInfoHash(value = '') {
  return String(value || '').trim().toLowerCase() || null;
}

export async function getMagnetInfoHash(magnetURI = '') {
  try {
    const parsedTorrent = await parseTorrent(magnetURI);
    return normaliseInfoHash(parsedTorrent.infoHash);
  } catch {
    return null;
  }
}

export function parseTorrentSource(source) {
  return parseTorrent(source);
}

export function isValidFilePriority(value = '') {
  return FILE_PRIORITY_VALUES.has(String(value || '').toLowerCase());
}

export function normaliseFilePriority(value = 'normal') {
  const normalizedValue = String(value || 'normal').toLowerCase();
  return isValidFilePriority(normalizedValue) ? normalizedValue : 'normal';
}

export function isTorrentFileName(value = '') {
  return path.extname(value).toLowerCase() === '.torrent';
}

export function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  return String(value).toLowerCase() === 'true';
}

export function toPortNumber(value, fallback = 8080) {
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return fallback;
  }

  return port;
}

export function toNonNegativeInteger(value, fallback = 0) {
  const normalizedValue = String(value ?? '').trim();
  const parsedValue = typeof value === 'number'
    ? value
    : (/^\d+$/.test(normalizedValue) ? Number.parseInt(normalizedValue, 10) : Number.NaN);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
    return fallback;
  }

  return parsedValue;
}

export function parseNonNegativeInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalizedValue = String(value).trim();
  const parsedValue = typeof value === 'number'
    ? value
    : (/^\d+$/.test(normalizedValue) ? Number.parseInt(normalizedValue, 10) : Number.NaN);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

export function toPositiveInteger(value, fallback = 1) {
  const normalizedValue = String(value ?? '').trim();
  const parsedValue = typeof value === 'number'
    ? value
    : (/^\d+$/.test(normalizedValue) ? Number.parseInt(normalizedValue, 10) : Number.NaN);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return parsedValue;
}
