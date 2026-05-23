import fs from 'fs-extra';
import path from 'node:path';
import WebTorrent from 'webtorrent';
import { nanoid } from 'nanoid';
import { getDb } from './db.service.js';
import { getConfig } from './config.service.js';
import { emitSocketEvent } from './socket.service.js';
import { syncMediaLibrary, deleteTorrentFiles } from './media.service.js';
import { buildFileRecord, isFileAvailable, normaliseTorrentFilePath, normalizeStoredFileRecord } from '../utils/file.utils.js';
import { resolveSafePath } from '../utils/path.utils.js';
import { getMagnetInfoHash, normaliseFilePriority, normaliseInfoHash, parseTorrentSource } from '../utils/validation.utils.js';

let torrentClient = null;
const activeTorrents = new Map();
const TORRENT_SNAPSHOT_INTERVAL_MS = 1000;
const MAX_VISIBLE_PEER_CONNECTIONS = 12;
const FILE_SELECTION_PRIORITIES = {
  low: 1,
  normal: 5,
  high: 10
};

function now() {
  return new Date().toISOString();
}

function getQueuedStatuses() {
  return new Set(['queued', 'checking', 'downloading']);
}

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isAdminUser(user) {
  return user?.role === 'admin';
}

function canAccessTorrentRecord(record, user) {
  if (!record || !user) {
    return false;
  }

  return isAdminUser(user) || (record.ownerUserId && record.ownerUserId === user.id);
}

function assertTorrentAccess(record, user) {
  if (!canAccessTorrentRecord(record, user)) {
    throw createHttpError('Torrent not found', 404);
  }
}

function buildSocketEventScope(record) {
  return {
    ownerUserId: record?.ownerUserId || null,
    includeAdmins: true
  };
}

function getTimestampValue(value) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getStoredActiveTimeSeconds(record) {
  const seconds = Number(record?.activeTimeSeconds);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return 0;
  }

  return Math.floor(seconds);
}

function getActiveStartedAt(record) {
  return getTimestampValue(record?.activeStartedAt) ? record.activeStartedAt : null;
}

function getElapsedActiveTimeSeconds(record, { active = false, referenceTime = Date.now() } = {}) {
  const storedSeconds = getStoredActiveTimeSeconds(record);
  const activeStartedAt = getTimestampValue(record?.activeStartedAt);

  if (!active || !activeStartedAt) {
    return storedSeconds;
  }

  return storedSeconds + Math.max(0, Math.floor((referenceTime - activeStartedAt) / 1000));
}

function startActiveTime(record, referenceTime = Date.now()) {
  const activeStartedAt = getActiveStartedAt(record) || new Date(referenceTime).toISOString();
  return {
    activeStartedAt,
    activeTimeSeconds: getStoredActiveTimeSeconds(record),
    activeTimeElapsed: getElapsedActiveTimeSeconds(
      { ...record, activeStartedAt },
      { active: true, referenceTime }
    )
  };
}

function stopActiveTime(record, referenceTime = Date.now()) {
  const activeTimeElapsed = getElapsedActiveTimeSeconds(record, {
    active: Boolean(getActiveStartedAt(record)),
    referenceTime
  });

  return {
    activeStartedAt: null,
    activeTimeSeconds: activeTimeElapsed,
    activeTimeElapsed
  };
}

function decorateTorrentRecord(record, referenceTime = Date.now()) {
  if (!record) {
    return null;
  }

  const normalizedFiles = (record.files || []).map((file) => normalizeStoredFileRecord(file, {
    torrentStatus: record.status
  }));
  const activeStartedAt = getActiveStartedAt(record);
  const isActivelyTrackingTime = Boolean(activeStartedAt) && ['checking', 'downloading'].includes(record.status);
  const activeTimeElapsed = isActivelyTrackingTime
    ? getElapsedActiveTimeSeconds(record, { active: true, referenceTime })
    : (activeStartedAt
      ? getElapsedActiveTimeSeconds(record, { active: true, referenceTime })
      : getStoredActiveTimeSeconds(record));

  return {
    ...record,
    files: normalizedFiles,
    activeStartedAt: isActivelyTrackingTime ? activeStartedAt : null,
    activeTimeSeconds: isActivelyTrackingTime ? getStoredActiveTimeSeconds(record) : activeTimeElapsed,
    activeTimeElapsed
  };
}

function getWebTorrentTransferLimit(limit = 0) {
  return Number(limit) > 0 ? Number(limit) : -1;
}

export function applyTransferLimits(config = getConfig()) {
  if (!torrentClient) {
    return;
  }

  torrentClient.throttleDownload(getWebTorrentTransferLimit(config.downloadSpeedLimit));
  torrentClient.throttleUpload(getWebTorrentTransferLimit(config.uploadSpeedLimit));
}

function getEmptyPeerConnectionState() {
  return {
    peers: 0,
    peersTotal: 0,
    connectedPeers: 0,
    queuedPeers: 0,
    seeds: 0,
    connectedSeeders: 0,
    peerConnections: []
  };
}

function isTrackablePeer(peer) {
  return Boolean(peer) && peer.type !== 'webSeed' && !peer.destroyed;
}

function getPeerAddress(peer, wire) {
  if (wire?.remoteAddress && wire?.remotePort) {
    return `${wire.remoteAddress}:${wire.remotePort}`;
  }

  if (wire?.remoteAddress) {
    return wire.remoteAddress;
  }

  if (typeof peer?.addr === 'string' && peer.addr.trim()) {
    return peer.addr;
  }

  return null;
}

function getPeerLabel(peer, wire) {
  const address = getPeerAddress(peer, wire);
  if (address) {
    return address;
  }

  if (peer?.type === 'webrtc' && peer?.id) {
    return `WebRTC ${String(peer.id).slice(0, 12)}`;
  }

  if (wire?.peerId) {
    return `Peer ${String(wire.peerId).slice(0, 12)}`;
  }

  if (peer?.id) {
    return String(peer.id);
  }

  return 'Unknown peer';
}

function summarizePeerConnections(torrent) {
  if (!torrent?._peers?.values) {
    return getEmptyPeerConnectionState();
  }

  const connectedWires = new Set(torrent.wires || []);
  const peerEntries = Array.from(torrent._peers.values()).filter(isTrackablePeer);
  const connectedPeerEntries = peerEntries.filter((peer) => (
    peer.connected &&
    peer.wire &&
    !peer.wire.destroyed &&
    connectedWires.has(peer.wire)
  ));

  const peerConnections = connectedPeerEntries
    .map((peer) => {
      const wire = peer.wire;
      const downloadSpeed = Number(wire?.downloadSpeed?.()) || 0;
      const uploadSpeed = Number(wire?.uploadSpeed?.()) || 0;

      return {
        id: String(peer.id || wire?.peerId || getPeerAddress(peer, wire) || 'unknown-peer'),
        label: getPeerLabel(peer, wire),
        address: getPeerAddress(peer, wire),
        peerId: wire?.peerId || null,
        source: peer.source || 'incoming',
        type: peer.type || wire?.type || 'unknown',
        isSeeder: Boolean(wire?.isSeeder),
        isChoked: Boolean(wire?.peerChoking),
        downloadSpeed,
        uploadSpeed,
        downloaded: Number(wire?.downloaded) || 0,
        uploaded: Number(wire?.uploaded) || 0
      };
    })
    .sort((left, right) => {
      if (right.downloadSpeed !== left.downloadSpeed) {
        return right.downloadSpeed - left.downloadSpeed;
      }

      if (right.uploadSpeed !== left.uploadSpeed) {
        return right.uploadSpeed - left.uploadSpeed;
      }

      return left.label.localeCompare(right.label);
    })
    .slice(0, MAX_VISIBLE_PEER_CONNECTIONS);

  const connectedPeers = connectedPeerEntries.length;
  const peersTotal = peerEntries.length;
  const connectedSeeders = connectedPeerEntries.filter((peer) => Boolean(peer.wire?.isSeeder)).length;

  return {
    peers: connectedPeers,
    peersTotal,
    connectedPeers,
    queuedPeers: Math.max(peersTotal - connectedPeers, 0),
    seeds: connectedSeeders,
    connectedSeeders,
    peerConnections
  };
}

function getWantedFiles(files = []) {
  return files.filter((file) => file.wanted !== false);
}

function summarizeManagedFiles(files = []) {
  const wantedFiles = getWantedFiles(files);
  const totalSize = wantedFiles.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  const downloaded = wantedFiles.reduce((sum, file) => {
    const size = Number(file.size) || 0;
    const fileDownloaded = Math.max(0, Math.min(size, Number(file.downloaded) || 0));
    return sum + fileDownloaded;
  }, 0);

  return {
    wantedFiles,
    hasWantedFiles: wantedFiles.length > 0,
    totalSize,
    downloaded,
    progress: totalSize > 0 ? Number(((downloaded / totalSize) * 100).toFixed(1)) : 0,
    areWantedFilesComplete: wantedFiles.length > 0 && wantedFiles.every((file) => isFileAvailable(file))
  };
}

function deriveManagedTorrentState(files, baseStatus, { active = false } = {}) {
  const summary = summarizeManagedFiles(files);

  if (files.length > 0 && !summary.hasWantedFiles) {
    return { ...summary, status: 'stopped' };
  }

  if (summary.areWantedFilesComplete) {
    return { ...summary, status: 'completed' };
  }

  if (active) {
    return {
      ...summary,
      status: baseStatus === 'checking' || baseStatus === 'queued' ? baseStatus : 'downloading'
    };
  }

  if (['paused', 'failed', 'needs_resume', 'queued', 'checking', 'downloading'].includes(baseStatus)) {
    return { ...summary, status: baseStatus };
  }

  return { ...summary, status: 'needs_resume' };
}

function getAvailableFileSignature(files = []) {
  return files
    .filter((file) => isFileAvailable(file))
    .map((file) => file.id)
    .sort()
    .join(':');
}

function buildManagedTorrentRecordData({
  record,
  torrent = null,
  files,
  baseStatus,
  active = false,
  forceCompletedAt = null
}) {
  const managedState = deriveManagedTorrentState(files, baseStatus, { active });
  const stoppedOrCompleted = managedState.status === 'stopped' || managedState.status === 'completed';
  const referenceTime = Date.now();
  const activeTimeData = active && ['checking', 'downloading'].includes(managedState.status)
    ? startActiveTime(record, referenceTime)
    : stopActiveTime(record, referenceTime);
  const peerConnectionState = active && !stoppedOrCompleted
    ? summarizePeerConnections(torrent)
    : getEmptyPeerConnectionState();

  return {
    name: torrent?.name || record.name || 'Unnamed torrent',
    infoHash: normaliseInfoHash(torrent?.infoHash || record.infoHash),
    status: managedState.status,
    progress: managedState.progress,
    downloadSpeed: stoppedOrCompleted ? 0 : (torrent?.downloadSpeed || record.downloadSpeed || 0),
    uploadSpeed: stoppedOrCompleted ? 0 : (torrent?.uploadSpeed || record.uploadSpeed || 0),
    peers: torrent?.numPeers ?? record.peers ?? 0,
    seeds: torrent?.numPeers ?? record.seeds ?? 0,
    eta: stoppedOrCompleted
      ? 0
      : (Number.isFinite(torrent?.timeRemaining) ? Math.ceil(torrent.timeRemaining / 1000) : (record.eta || 0)),
    downloaded: managedState.downloaded,
    totalSize: managedState.totalSize,
    downloadPath: files[0] ? path.posix.dirname(files[0].path) : (record.downloadPath || ''),
    files,
    completedAt: managedState.status === 'completed'
      ? (forceCompletedAt || record.completedAt || now())
      : null,
    error: managedState.status === 'completed' || managedState.status === 'stopped'
      ? null
      : (active ? null : record.error),
    ...peerConnectionState,
    ...activeTimeData
  };
}

async function rebuildTorrentSelectionFromRecord(record, torrent) {
  if (!torrent?.pieces?.length || !torrent?.files?.length) {
    return;
  }

  torrent.deselect(0, torrent.pieces.length - 1);

  const recordFilesByPath = new Map(
    (record.files || []).map((file) => [file.path, file])
  );

  for (const torrentFile of torrent.files) {
    const filePath = normaliseTorrentFilePath(torrentFile.path || torrentFile.name);
    const recordFile = recordFilesByPath.get(filePath);

    if (recordFile?.wanted === false) {
      continue;
    }

    const priority = FILE_SELECTION_PRIORITIES[normaliseFilePriority(recordFile?.priority)];
    torrentFile.select(priority);
  }
}

async function maybeSyncMediaLibrary(previousRecord, nextRecord) {
  const previousSignature = getAvailableFileSignature(previousRecord?.files || []);
  const nextSignature = getAvailableFileSignature(nextRecord?.files || []);

  if (previousRecord?.status !== nextRecord?.status || previousSignature !== nextSignature) {
    await syncMediaLibrary();
  }
}

async function persistTorrents(mutator) {
  const database = getDb();
  await database.read();
  const result = await mutator(database.data.torrents);
  await database.write();
  return result;
}

async function readTorrentRecord(id) {
  const database = getDb();
  await database.read();
  return decorateTorrentRecord(
    database.data.torrents.find((torrent) => torrent.id === id) || null
  );
}

async function writeTorrentRecord(id, partial) {
  return persistTorrents((torrents) => {
    const torrent = torrents.find((item) => item.id === id);
    if (!torrent) {
      throw new Error('Torrent not found');
    }

    Object.assign(torrent, partial, { updatedAt: now() });
    return decorateTorrentRecord(torrent);
  });
}

function getActiveCount() {
  return activeTorrents.size;
}

function createEmptyTorrentRecord({ sourceType, magnetURI = null, torrentFile = null, status, ownerUser = null }) {
  return {
    id: nanoid(),
    name: sourceType === 'magnet' ? 'Fetching metadata...' : torrentFile?.originalname || 'Uploaded torrent',
    sourceType,
    magnetURI,
    ownerUserId: ownerUser?.id || null,
    ownerUsername: ownerUser?.username || null,
    infoHash: null,
    torrentFileName: torrentFile?.filename || null,
    status,
    progress: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    peers: 0,
    peersTotal: 0,
    connectedPeers: 0,
    queuedPeers: 0,
    seeds: 0,
    connectedSeeders: 0,
    eta: 0,
    downloaded: 0,
    totalSize: 0,
    downloadPath: '',
    files: [],
    peerConnections: [],
    activeTimeSeconds: 0,
    activeStartedAt: null,
    activeTimeElapsed: 0,
    createdAt: now(),
    updatedAt: now(),
    completedAt: null,
    error: null
  };
}

async function cleanupUploadedTorrentFile(torrentFile) {
  if (!torrentFile?.filename) {
    return;
  }

  const uploadPath = torrentFile.path || resolveSafePath(getConfig().uploadDir, torrentFile.filename);
  if (await fs.pathExists(uploadPath)) {
    await fs.remove(uploadPath);
  }
}

function getTorrentSource(record) {
  const config = getConfig();

  if (record.sourceType === 'magnet') {
    return record.magnetURI;
  }

  if (!record.torrentFileName) {
    throw new Error('Uploaded torrent file reference is missing');
  }

  return resolveSafePath(config.uploadDir, record.torrentFileName);
}

function mapFilesFromTorrent(record, torrent) {
  const existingFiles = new Map((record.files || []).map((file) => [file.path, file]));

  return (torrent.files || []).map((file) => {
    const relativePath = normaliseTorrentFilePath(file.path || file.name);
    return buildFileRecord({
      existingFile: existingFiles.get(relativePath),
      fallbackId: nanoid(),
      name: file.name,
      relativePath,
      size: file.length,
      downloaded: file.downloaded,
      progress: Number((file.progress * 100).toFixed(1))
    });
  });
}

async function syncTorrentSnapshot(recordId, torrent, nextStatus) {
  const activeRecord = activeTorrents.get(recordId);
  if (activeRecord?.snapshotInFlight) {
    activeRecord.pendingSnapshotStatus = nextStatus;
    return activeRecord.lastSnapshot || readTorrentRecord(recordId);
  }

  if (activeRecord) {
    activeRecord.snapshotInFlight = true;
  }

  const currentRecord = await readTorrentRecord(recordId);
  const files = mapFilesFromTorrent(currentRecord, torrent);
  try {
    const nextRecord = await writeTorrentRecord(
      recordId,
      buildManagedTorrentRecordData({
        record: currentRecord,
        torrent,
        files,
        baseStatus: nextStatus,
        active: true
      })
    );

    await maybeSyncMediaLibrary(currentRecord, nextRecord);

    if (activeRecord) {
      activeRecord.lastSnapshot = nextRecord;
    }

    emitSocketEvent('torrent:progress', { success: true, data: nextRecord }, buildSocketEventScope(nextRecord));
    return nextRecord;
  } finally {
    if (activeRecord) {
      activeRecord.snapshotInFlight = false;
      const pendingSnapshotStatus = activeRecord.pendingSnapshotStatus;
      activeRecord.pendingSnapshotStatus = null;

      if (pendingSnapshotStatus && activeTorrents.get(recordId) === activeRecord) {
        void syncTorrentSnapshot(recordId, torrent, pendingSnapshotStatus);
      }
    }
  }
}

function clearTorrentBinding(recordId) {
  const activeRecord = activeTorrents.get(recordId);
  if (activeRecord?.intervalId) {
    clearInterval(activeRecord.intervalId);
  }

  activeTorrents.delete(recordId);
}

async function removeClientTorrent(torrent) {
  if (!torrentClient) {
    return;
  }

  await new Promise((resolve) => {
    const callback = () => resolve();
    try {
      torrentClient.remove(torrent?.infoHash || torrent?.magnetURI || torrent, callback);
    } catch {
      resolve();
    }
  });
}

async function startQueuedTorrentsIfPossible() {
  const config = getConfig();
  if (getActiveCount() >= config.maxActiveTorrents) {
    return;
  }

  const database = getDb();
  await database.read();
  const nextQueuedTorrent = database.data.torrents.find((torrent) => torrent.status === 'queued');
  if (!nextQueuedTorrent) {
    return;
  }

  await startTorrentRecord(nextQueuedTorrent, 'resumed');
}

async function finalizeTorrent(recordId, torrent) {
  clearTorrentBinding(recordId);
  const currentRecord = await readTorrentRecord(recordId);
  const files = mapFilesFromTorrent(currentRecord, torrent);
  const nextRecord = await writeTorrentRecord(
    recordId,
    buildManagedTorrentRecordData({
      record: currentRecord,
      torrent,
      files,
      baseStatus: 'completed',
      active: true,
      forceCompletedAt: now()
    })
  );

  await syncMediaLibrary();
  emitSocketEvent('torrent:completed', { success: true, data: nextRecord }, buildSocketEventScope(nextRecord));

  if (getConfig().autoDeleteCompleted) {
    await deleteTorrent(nextRecord.id, false);
  } else {
    await startQueuedTorrentsIfPossible();
  }
}

async function registerLiveTorrent(recordId, torrent, resumeEventName) {
  const intervalId = setInterval(async () => {
    try {
      await syncTorrentSnapshot(recordId, torrent, torrent.progress >= 1 ? 'completed' : 'downloading');
    } catch (error) {
      await failTorrent(recordId, error);
    }
  }, TORRENT_SNAPSHOT_INTERVAL_MS);

  activeTorrents.set(recordId, {
    torrent,
    intervalId,
    lastSnapshot: null,
    pendingSnapshotStatus: null,
    snapshotInFlight: false
  });

  torrent.on('error', async (error) => {
    await failTorrent(recordId, error);
  });

  torrent.on('metadata', async () => {
    try {
      const record = await syncTorrentSnapshot(recordId, torrent, 'downloading');
      await rebuildTorrentSelectionFromRecord(record, torrent);
      const updatedRecord = await syncTorrentSnapshot(recordId, torrent, 'downloading');
      emitSocketEvent(resumeEventName, { success: true, data: updatedRecord }, buildSocketEventScope(updatedRecord));
    } catch (error) {
      await failTorrent(recordId, error);
    }
  });

  torrent.on('done', async () => {
    await finalizeTorrent(recordId, torrent);
  });
}

async function failTorrent(recordId, error) {
  const activeRecord = activeTorrents.get(recordId);
  const record = await readTorrentRecord(recordId);
  clearTorrentBinding(recordId);
  if (activeRecord?.torrent) {
    await removeClientTorrent(activeRecord.torrent);
  }
  const nextRecord = await writeTorrentRecord(recordId, {
    status: 'failed',
    error: error.message,
    downloadSpeed: 0,
    uploadSpeed: 0,
    ...getEmptyPeerConnectionState(),
    ...stopActiveTime(record)
  });

  emitSocketEvent('torrent:error', {
    success: false,
    data: nextRecord,
    message: error.message
  }, buildSocketEventScope(nextRecord));

  await startQueuedTorrentsIfPossible();
}

async function startTorrentRecord(record, eventName = 'torrent:added') {
  const config = getConfig();

  if (getActiveCount() >= config.maxActiveTorrents) {
    const queuedRecord = await writeTorrentRecord(record.id, {
      status: 'queued',
      ...getEmptyPeerConnectionState(),
      ...stopActiveTime(record)
    });
    emitSocketEvent(eventName, { success: true, data: queuedRecord }, buildSocketEventScope(queuedRecord));
    return queuedRecord;
  }

  const source = getTorrentSource(record);
  const torrent = torrentClient.add(source, {
    path: config.downloadDir
  });

  await registerLiveTorrent(record.id, torrent, eventName);
  const checkingRecord = await writeTorrentRecord(record.id, {
    status: 'checking',
    error: null,
    ...startActiveTime(record)
  });

  emitSocketEvent(eventName, { success: true, data: checkingRecord }, buildSocketEventScope(checkingRecord));
  return checkingRecord;
}

export async function initializeTorrentService() {
  if (torrentClient) {
    return torrentClient;
  }

  const config = getConfig();

  torrentClient = new WebTorrent({
    natUpnp: false,
    natPmp: false,
    downloadLimit: getWebTorrentTransferLimit(config.downloadSpeedLimit),
    uploadLimit: getWebTorrentTransferLimit(config.uploadSpeedLimit)
  });
  torrentClient.on('error', (error) => {
    console.error(`WebTorrent error: ${error.message}`);
  });

  await persistTorrents((torrents) => {
    const pendingStatuses = getQueuedStatuses();
    const referenceTime = Date.now();
    torrents.forEach((torrent) => {
      if (pendingStatuses.has(torrent.status)) {
        torrent.status = 'needs_resume';
        torrent.error = 'Restart required manual resume';
        Object.assign(torrent, getEmptyPeerConnectionState(), stopActiveTime(torrent, referenceTime));
        torrent.updatedAt = now();
      }
    });
  });

  applyTransferLimits(config);
  await syncMediaLibrary();
  return torrentClient;
}

async function getRecordInfoHash(record) {
  if (record.infoHash) {
    return normaliseInfoHash(record.infoHash);
  }

  if (record.magnetURI) {
    return getMagnetInfoHash(record.magnetURI);
  }

  if (record.sourceType === 'file' && record.torrentFileName) {
    try {
      const torrentFilePath = resolveSafePath(getConfig().uploadDir, record.torrentFileName);
      const torrentFileBuffer = await fs.readFile(torrentFilePath);
      const parsedTorrent = await parseTorrentSource(torrentFileBuffer);
      return normaliseInfoHash(parsedTorrent.infoHash);
    } catch {
      return null;
    }
  }

  return null;
}

function buildDuplicateMessage(record, user = null) {
  if (!canAccessTorrentRecord(record, user) && !isAdminUser(user)) {
    return 'This torrent already exists in OpenFlux.';
  }

  const torrentName = record.name || 'Unknown torrent';
  return `This torrent already exists in OpenFlux as "${torrentName}" with status "${record.status}".`;
}

async function findDuplicateTorrent({ infoHash, magnetURI = null }) {
  const normalizedInfoHash = normaliseInfoHash(infoHash) || await getMagnetInfoHash(magnetURI);
  const normalizedMagnetURI = magnetURI?.trim() || null;
  const database = getDb();
  await database.read();

  for (const record of database.data.torrents) {
    const recordInfoHash = await getRecordInfoHash(record);

    if (normalizedInfoHash && recordInfoHash && recordInfoHash === normalizedInfoHash) {
      return record;
    }

    if (!normalizedInfoHash && normalizedMagnetURI && record.magnetURI?.trim() === normalizedMagnetURI) {
      return record;
    }
  }

  return null;
}

export async function listTorrents({ user } = {}) {
  const database = getDb();
  await database.read();
  return database.data.torrents
    .slice()
    .filter((torrent) => !user || canAccessTorrentRecord(torrent, user))
    .map((torrent) => decorateTorrentRecord(torrent))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export async function getTorrentById(id, { user } = {}) {
  const torrent = await readTorrentRecord(id);
  if (!torrent) {
    throw createHttpError('Torrent not found', 404);
  }

  if (user) {
    assertTorrentAccess(torrent, user);
  }

  return torrent;
}

export async function addMagnetTorrent(magnetURI, { user } = {}) {
  const infoHash = await getMagnetInfoHash(magnetURI);
  const duplicateRecord = await findDuplicateTorrent({ infoHash, magnetURI });
  if (duplicateRecord) {
    throw createHttpError(buildDuplicateMessage(duplicateRecord, user), 409);
  }

  const record = createEmptyTorrentRecord({
    sourceType: 'magnet',
    magnetURI,
    status: 'queued',
    ownerUser: user
  });
  record.infoHash = infoHash;

  await persistTorrents((torrents) => {
    torrents.unshift(record);
  });

  return startTorrentRecord(record);
}

export async function addTorrentFile(torrentFile, { user } = {}) {
  let infoHash;

  try {
    const torrentFileBuffer = await fs.readFile(torrentFile.path || resolveSafePath(getConfig().uploadDir, torrentFile.filename));
    const parsedTorrent = await parseTorrentSource(torrentFileBuffer);
    infoHash = normaliseInfoHash(parsedTorrent.infoHash);
  } catch (error) {
    await cleanupUploadedTorrentFile(torrentFile);
    throw createHttpError('Invalid .torrent file. Please upload a valid torrent file.', 400);
  }

  const duplicateRecord = await findDuplicateTorrent({ infoHash });
  if (duplicateRecord) {
    await cleanupUploadedTorrentFile(torrentFile);
    throw createHttpError(buildDuplicateMessage(duplicateRecord, user), 409);
  }

  const record = createEmptyTorrentRecord({
    sourceType: 'file',
    torrentFile,
    status: 'queued',
    ownerUser: user
  });
  record.infoHash = infoHash;

  await persistTorrents((torrents) => {
    torrents.unshift(record);
  });

  return startTorrentRecord(record);
}

export async function updateTorrentFilePreferences(torrentId, fileId, preferences = {}, { user } = {}) {
  const currentRecord = await getTorrentById(torrentId, { user });
  const activeRecord = activeTorrents.get(torrentId);

  let nextRecord = await persistTorrents((torrents) => {
    const torrent = torrents.find((item) => item.id === currentRecord.id);
    if (!torrent) {
      throw new Error('Torrent not found');
    }

    const file = (torrent.files || []).find((item) => item.id === fileId);
    if (!file) {
      throw new Error('File not found');
    }

    if (typeof preferences.wanted === 'boolean') {
      file.wanted = preferences.wanted;
    }

    if (preferences.priority) {
      file.priority = normaliseFilePriority(preferences.priority);
    }

    return torrent;
  });

  if (activeRecord?.torrent?.files?.length) {
    await rebuildTorrentSelectionFromRecord(nextRecord, activeRecord.torrent);
    nextRecord = await syncTorrentSnapshot(
      torrentId,
      activeRecord.torrent,
      activeRecord.torrent.progress >= 1 ? 'completed' : 'downloading'
    );
    return nextRecord;
  }

  const previousRecord = nextRecord;
  nextRecord = await writeTorrentRecord(
    torrentId,
    buildManagedTorrentRecordData({
      record: nextRecord,
      files: nextRecord.files || [],
      baseStatus: nextRecord.status,
      active: false
    })
  );

  await maybeSyncMediaLibrary(previousRecord, nextRecord);
  emitSocketEvent('torrent:progress', { success: true, data: nextRecord }, buildSocketEventScope(nextRecord));

  return nextRecord;
}

export async function pauseTorrent(id, { user } = {}) {
  const record = await getTorrentById(id, { user });
  const activeRecord = activeTorrents.get(id);

  if (activeRecord) {
    clearTorrentBinding(id);
    await removeClientTorrent(activeRecord.torrent);
  }

  const nextRecord = await writeTorrentRecord(record.id, {
    status: 'paused',
    downloadSpeed: 0,
    uploadSpeed: 0,
    eta: 0,
    ...getEmptyPeerConnectionState(),
    ...stopActiveTime(record)
  });

  emitSocketEvent('torrent:paused', { success: true, data: nextRecord }, buildSocketEventScope(nextRecord));
  await startQueuedTorrentsIfPossible();
  return nextRecord;
}

export async function resumeTorrent(id, { user } = {}) {
  const record = await getTorrentById(id, { user });

  if (activeTorrents.has(id)) {
    return record;
  }

  const nextRecord = await writeTorrentRecord(id, {
    status: 'queued',
    error: null,
    ...getEmptyPeerConnectionState(),
    ...stopActiveTime(record)
  });

  return startTorrentRecord(nextRecord, 'torrent:resumed');
}

export async function deleteTorrent(id, deleteFiles = false, { user } = {}) {
  const record = await getTorrentById(id, { user });
  const activeRecord = activeTorrents.get(id);

  if (activeRecord) {
    clearTorrentBinding(id);
    await removeClientTorrent(activeRecord.torrent);
  }

  if (deleteFiles) {
    await deleteTorrentFiles(record.files || []);
  }

  await persistTorrents((torrents) => {
    const index = torrents.findIndex((torrent) => torrent.id === id);
    if (index >= 0) {
      torrents.splice(index, 1);
    }
  });

  await syncMediaLibrary();
  emitSocketEvent('torrent:deleted', { success: true, data: { id } }, buildSocketEventScope(record));
  await startQueuedTorrentsIfPossible();

  if (record.torrentFileName) {
    const uploadPath = resolveSafePath(getConfig().uploadDir, record.torrentFileName);
    if (await fs.pathExists(uploadPath)) {
      await fs.remove(uploadPath);
    }
  }
}

export async function shutdownTorrentService() {
  if (!torrentClient) {
    return;
  }

  for (const [recordId, activeRecord] of activeTorrents.entries()) {
    clearTorrentBinding(recordId);
    await removeClientTorrent(activeRecord.torrent);
  }

  await new Promise((resolve) => {
    torrentClient.destroy(() => resolve());
  });

  torrentClient = null;
}
