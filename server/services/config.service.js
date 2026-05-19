import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { isMultiCoreRuntimeEnabled } from './runtime.service.js';
import { ensureStoragePaths, getDefaultPaths, getDefaultStorageDir } from './storage.service.js';
import { parseNonNegativeInteger, toNonNegativeInteger, toPortNumber, toPositiveInteger } from '../utils/validation.utils.js';

const require = createRequire(import.meta.url);
const packageInfo = require('../../package.json');

let cachedConfig = null;

function getAvailableCoreCount() {
  return typeof os.availableParallelism === 'function'
    ? os.availableParallelism()
    : os.cpus().length;
}

function normalizeRuntimeCoreCount(value, fallback = 1) {
  const availableCoreCount = getAvailableCoreCount();
  const parsedValue = toPositiveInteger(value, fallback);
  return Math.max(1, Math.min(availableCoreCount, parsedValue));
}

function getDefaultConfig(storageDir) {
  const defaultPaths = getDefaultPaths(storageDir);

  return {
    host: 'localhost',
    port: 8080,
    downloadDir: defaultPaths.downloadDir,
    uploadDir: defaultPaths.uploadDir,
    runtimeCoreCount: 1,
    maxActiveTorrents: 3,
    downloadSpeedLimit: 0,
    uploadSpeedLimit: 0,
    autoDeleteCompleted: false,
    legalNoticeAccepted: false
  };
}

function getPersistedConfig(config) {
  return {
    host: config.host,
    port: config.port,
    downloadDir: config.downloadDir,
    uploadDir: config.uploadDir,
    runtimeCoreCount: config.runtimeCoreCount,
    maxActiveTorrents: config.maxActiveTorrents,
    downloadSpeedLimit: config.downloadSpeedLimit,
    uploadSpeedLimit: config.uploadSpeedLimit,
    autoDeleteCompleted: config.autoDeleteCompleted,
    legalNoticeAccepted: config.legalNoticeAccepted
  };
}

async function persistConfig(configPath, config) {
  await fs.writeJson(configPath, getPersistedConfig(config), { spaces: 2 });
}

export function getPackageInfo() {
  return packageInfo;
}

export async function initializeConfig(overrides = {}, { persist = true } = {}) {
  const storageDir = getDefaultStorageDir();
  const paths = getDefaultPaths(storageDir);
  await ensureStoragePaths(paths);

  const fileConfig = (await fs.pathExists(paths.configPath))
    ? await fs.readJson(paths.configPath)
    : {};

  const defaultConfig = getDefaultConfig(storageDir);
  const mergedConfig = {
    ...defaultConfig,
    ...fileConfig,
    ...(overrides.host ? { host: overrides.host } : {}),
    ...(overrides.port ? { port: toPortNumber(overrides.port, defaultConfig.port) } : {}),
    ...(overrides.runtimeCoreCount ? { runtimeCoreCount: overrides.runtimeCoreCount } : {}),
    ...(overrides.downloadDir
      ? { downloadDir: path.resolve(overrides.downloadDir) }
      : {})
  };

  mergedConfig.port = toPortNumber(mergedConfig.port, defaultConfig.port);
  mergedConfig.runtimeCoreCount = normalizeRuntimeCoreCount(
    mergedConfig.runtimeCoreCount,
    defaultConfig.runtimeCoreCount
  );
  mergedConfig.downloadSpeedLimit = toNonNegativeInteger(
    mergedConfig.downloadSpeedLimit,
    defaultConfig.downloadSpeedLimit
  );
  mergedConfig.uploadSpeedLimit = toNonNegativeInteger(
    mergedConfig.uploadSpeedLimit,
    defaultConfig.uploadSpeedLimit
  );

  const resolvedPaths = {
    storageDir,
    downloadDir: path.resolve(mergedConfig.downloadDir || defaultConfig.downloadDir),
    uploadDir: path.resolve(mergedConfig.uploadDir || defaultConfig.uploadDir),
    logsDir: paths.logsDir,
    dbPath: paths.dbPath,
    configPath: paths.configPath
  };

  await ensureStoragePaths(resolvedPaths);

  cachedConfig = {
    ...mergedConfig,
    ...resolvedPaths,
    version: packageInfo.version
  };

  if (persist) {
    await persistConfig(paths.configPath, cachedConfig);
  }

  return cachedConfig;
}

export function getConfig() {
  if (!cachedConfig) {
    throw new Error('OpenFlux configuration has not been initialized');
  }

  return cachedConfig;
}

export function getSafeConfig() {
  const config = getConfig();

  return {
    host: config.host,
    port: config.port,
    downloadDir: config.downloadDir,
    runtimeCoreCount: config.runtimeCoreCount,
    availableCoreCount: getAvailableCoreCount(),
    multiCoreConfigured: config.runtimeCoreCount > 1,
    multiCoreRuntimeEnabled: isMultiCoreRuntimeEnabled(config),
    maxActiveTorrents: config.maxActiveTorrents,
    downloadSpeedLimit: config.downloadSpeedLimit,
    uploadSpeedLimit: config.uploadSpeedLimit,
    autoDeleteCompleted: config.autoDeleteCompleted,
    legalNoticeAccepted: config.legalNoticeAccepted,
    storageDir: config.storageDir,
    version: config.version
  };
}

export async function updateConfig(updates = {}) {
  const config = getConfig();
  const nextConfig = { ...config };

  if (Object.prototype.hasOwnProperty.call(updates, 'downloadSpeedLimit')) {
    const downloadSpeedLimit = parseNonNegativeInteger(updates.downloadSpeedLimit);
    if (downloadSpeedLimit === null) {
      throw new Error('Download speed limit must be a non-negative integer');
    }
    nextConfig.downloadSpeedLimit = downloadSpeedLimit;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'uploadSpeedLimit')) {
    const uploadSpeedLimit = parseNonNegativeInteger(updates.uploadSpeedLimit);
    if (uploadSpeedLimit === null) {
      throw new Error('Upload speed limit must be a non-negative integer');
    }
    nextConfig.uploadSpeedLimit = uploadSpeedLimit;
  }

  cachedConfig = nextConfig;
  await persistConfig(config.configPath, cachedConfig);

  return getSafeConfig();
}
