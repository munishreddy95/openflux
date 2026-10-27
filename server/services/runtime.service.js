import cluster from 'node:cluster';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import fs from 'fs-extra';

export const RUNTIME_ROLE = {
  single: 'single',
  control: 'control',
  web: 'web'
};

const ROLE_ENV_KEY = 'OPENFLUX_RUNTIME_ROLE';
const CONTROL_PORT_ENV_KEY = 'OPENFLUX_CONTROL_PORT';
const PUBLIC_PORT_ENV_KEY = 'OPENFLUX_PUBLIC_PORT';
const REPORT_INTERVAL_MS = 1000;
const WORKER_REGISTRY_FILENAME = 'openflux.runtime.workers.json';
const WORKER_STATS_DIRECTORY = 'openflux.runtime.workers';

let reportIntervalId = null;
let lastProcessCpuUsage = process.cpuUsage();
let lastSampleTime = process.hrtime.bigint();
let runtimeStorageDir = null;
let supervisorConfig = null;
let localStatsWriteQueue = Promise.resolve();
let supervisorRegistryWriteQueue = Promise.resolve();
let workerStatsCleanupRegistered = false;

const supervisorWorkerMeta = new Map();

let latestLocalRuntimeStats = {
  pid: process.pid,
  role: getRuntimeRole(),
  cpuPercent: 0,
  memoryBytes: process.memoryUsage().rss,
  heapUsedBytes: process.memoryUsage().heapUsed,
  heapTotalBytes: process.memoryUsage().heapTotal,
  externalBytes: process.memoryUsage().external,
  arrayBuffersBytes: process.memoryUsage().arrayBuffers || 0,
  uptimeSeconds: Math.floor(process.uptime()),
  sampledAt: new Date().toISOString()
};

export function getAvailableCoreCount() {
  return typeof os.availableParallelism === 'function'
    ? os.availableParallelism()
    : os.cpus().length;
}

export function getRuntimeRoleEnvKey() {
  return ROLE_ENV_KEY;
}

export function getControlPortEnvKey() {
  return CONTROL_PORT_ENV_KEY;
}

export function getPublicPortEnvKey() {
  return PUBLIC_PORT_ENV_KEY;
}

export function getRuntimeRole() {
  return process.env[ROLE_ENV_KEY] || RUNTIME_ROLE.single;
}

export function isControlRuntime() {
  return getRuntimeRole() === RUNTIME_ROLE.control || getRuntimeRole() === RUNTIME_ROLE.single;
}

export function isWebRuntime() {
  return getRuntimeRole() === RUNTIME_ROLE.web;
}

export function isMultiCoreRuntimeConfigured(config = null) {
  const runtimeCoreCount = Number(config?.runtimeCoreCount) || 0;
  return runtimeCoreCount > 1;
}

export function isMultiCoreRuntimeSupported() {
  const majorVersion = Number.parseInt(String(process.versions?.node || '').split('.')[0] || '', 10);

  if (!Number.isInteger(majorVersion)) {
    return true;
  }

  return majorVersion !== 24;
}

export function isMultiCoreRuntimeEnabled(_config = null) {
  return getRuntimeRole() !== RUNTIME_ROLE.single;
}

export function getControlPort() {
  const controlPort = Number.parseInt(process.env[CONTROL_PORT_ENV_KEY] || '', 10);
  return Number.isInteger(controlPort) && controlPort > 0 ? controlPort : null;
}

export function getPublicPort() {
  const publicPort = Number.parseInt(process.env[PUBLIC_PORT_ENV_KEY] || '', 10);
  return Number.isInteger(publicPort) && publicPort > 0 ? publicPort : null;
}

function roundUsage(value, max = 999.9) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Number(Math.min(max, value).toFixed(1));
}

function getStorageDir(config = supervisorConfig) {
  return config?.storageDir || runtimeStorageDir || null;
}

function getWorkerStatsDirectory(config = supervisorConfig) {
  const storageDir = getStorageDir(config);
  return storageDir ? path.join(storageDir, WORKER_STATS_DIRECTORY) : null;
}

function getWorkerStatsPath(pid = process.pid, config = supervisorConfig) {
  const statsDirectory = getWorkerStatsDirectory(config);
  return statsDirectory ? path.join(statsDirectory, `${pid}.json`) : null;
}

function getWorkerRegistryPath(config = supervisorConfig) {
  const storageDir = getStorageDir(config);
  return storageDir ? path.join(storageDir, WORKER_REGISTRY_FILENAME) : null;
}

function sampleLocalRuntimeStats() {
  const now = process.hrtime.bigint();
  const elapsedMicroseconds = Math.max(Number(now - lastSampleTime) / 1000, 1);
  const processDelta = process.cpuUsage(lastProcessCpuUsage);
  const processMemory = process.memoryUsage();

  latestLocalRuntimeStats = {
    pid: process.pid,
    role: getRuntimeRole(),
    cpuPercent: roundUsage(((processDelta.user + processDelta.system) / elapsedMicroseconds) * 100),
    memoryBytes: processMemory.rss,
    heapUsedBytes: processMemory.heapUsed,
    heapTotalBytes: processMemory.heapTotal,
    externalBytes: processMemory.external,
    arrayBuffersBytes: processMemory.arrayBuffers || 0,
    uptimeSeconds: Math.floor(process.uptime()),
    sampledAt: new Date().toISOString()
  };

  lastProcessCpuUsage = process.cpuUsage();
  lastSampleTime = now;
  return latestLocalRuntimeStats;
}

function queueLocalRuntimeStatsWrite() {
  const statsPath = getWorkerStatsPath(process.pid);
  if (!statsPath) {
    return;
  }

  const nextStats = {
    ...latestLocalRuntimeStats,
    pid: process.pid,
    role: getRuntimeRole()
  };

  localStatsWriteQueue = localStatsWriteQueue
    .catch(() => {})
    .then(() => fs.outputJson(statsPath, nextStats, { spaces: 2 }))
    .catch(() => {});
}

function registerWorkerStatsCleanup() {
  if (workerStatsCleanupRegistered) {
    return;
  }

  const cleanup = () => {
    const statsPath = getWorkerStatsPath(process.pid);
    if (!statsPath) {
      return;
    }

    try {
      fs.removeSync(statsPath);
    } catch {
      // Ignore cleanup failures during worker shutdown.
    }
  };

  process.once('exit', cleanup);
  workerStatsCleanupRegistered = true;
}

export function initializeRuntimeTelemetry(config = null) {
  if (config?.storageDir) {
    runtimeStorageDir = config.storageDir;
  }

  if (reportIntervalId) {
    return;
  }

  sampleLocalRuntimeStats();
  queueLocalRuntimeStatsWrite();
  registerWorkerStatsCleanup();

  reportIntervalId = setInterval(() => {
    sampleLocalRuntimeStats();
    queueLocalRuntimeStatsWrite();
  }, REPORT_INTERVAL_MS);

  reportIntervalId.unref?.();
}

export function getLocalRuntimeStats() {
  return latestLocalRuntimeStats;
}

function queueSupervisorWorkerRegistryWrite() {
  const registryPath = getWorkerRegistryPath();
  if (!registryPath) {
    return;
  }

  const workers = Array.from(supervisorWorkerMeta.values()).map((workerMeta) => ({
    workerId: workerMeta.workerId,
    role: workerMeta.role,
    pid: workerMeta.pid
  }));

  const nextRegistry = {
    updatedAt: new Date().toISOString(),
    workers
  };

  supervisorRegistryWriteQueue = supervisorRegistryWriteQueue
    .catch(() => {})
    .then(() => fs.outputJson(registryPath, nextRegistry, { spaces: 2 }))
    .catch(() => {});
}

export function initializeRuntimeSupervisor(config) {
  supervisorConfig = config;
  runtimeStorageDir = config?.storageDir || runtimeStorageDir;
  queueSupervisorWorkerRegistryWrite();
}

export function registerSupervisorWorker(worker, { role }) {
  supervisorWorkerMeta.set(worker.id, {
    workerId: worker.id,
    role,
    pid: worker.process?.pid || null
  });
  queueSupervisorWorkerRegistryWrite();

  worker.on('exit', () => {
    supervisorWorkerMeta.delete(worker.id);
    queueSupervisorWorkerRegistryWrite();
  });
}

function buildRuntimeSummaryFromWorkers(workers = [], config = supervisorConfig) {
  const processCount = workers.length || 1;
  const totalCpuPercent = workers.reduce((sum, worker) => sum + (Number(worker.cpuPercent) || 0), 0);
  const totalMemoryBytes = workers.reduce((sum, worker) => sum + (Number(worker.memoryBytes) || 0), 0);
  const totalHeapUsedBytes = workers.reduce((sum, worker) => sum + (Number(worker.heapUsedBytes) || 0), 0);
  const totalHeapTotalBytes = workers.reduce((sum, worker) => sum + (Number(worker.heapTotalBytes) || 0), 0);
  const totalExternalBytes = workers.reduce((sum, worker) => sum + (Number(worker.externalBytes) || 0), 0);
  const totalArrayBuffersBytes = workers.reduce((sum, worker) => sum + (Number(worker.arrayBuffersBytes) || 0), 0);
  const sampledAt = workers.reduce((latest, worker) => {
    return !latest || String(worker.sampledAt || '') > latest ? String(worker.sampledAt || '') : latest;
  }, '');
  const controlWorkerCount = workers.filter((worker) => worker.role === RUNTIME_ROLE.control).length;
  const webWorkerCount = workers.filter((worker) => worker.role === RUNTIME_ROLE.web).length;

  return {
    host: config?.host || 'localhost',
    port: config?.port || 8080,
    bindAddress: `${config?.host || 'localhost'}:${config?.port || 8080}`,
    configuredCoreCount: Number(config?.runtimeCoreCount) || 1,
    availableCoreCount: getAvailableCoreCount(),
    multiCoreRuntimeEnabled: processCount > 1,
    processCount,
    controlWorkerCount,
    webWorkerCount,
    totalCpuPercent: roundUsage(totalCpuPercent, 9999),
    totalMemoryBytes,
    totalHeapUsedBytes,
    totalHeapTotalBytes,
    totalExternalBytes,
    totalArrayBuffersBytes,
    sampledAt: sampledAt || new Date().toISOString(),
    workers
  };
}

function buildSingleProcessRuntimeSnapshot(config) {
  return buildRuntimeSummaryFromWorkers([
    {
      ...getLocalRuntimeStats(),
      pid: process.pid,
      role: getRuntimeRole()
    }
  ], config);
}

async function readWorkerRuntimeStats(workerMeta, config) {
  const statsPath = getWorkerStatsPath(workerMeta.pid, config);
  let workerStats = null;

  if (statsPath) {
    try {
      workerStats = await fs.readJson(statsPath);
    } catch {
      workerStats = null;
    }
  }

  return {
    pid: workerStats?.pid || workerMeta.pid || null,
    role: workerStats?.role || workerMeta.role,
    workerId: workerMeta.workerId,
    cpuPercent: workerStats?.cpuPercent || 0,
    memoryBytes: workerStats?.memoryBytes || 0,
    heapUsedBytes: workerStats?.heapUsedBytes || 0,
    heapTotalBytes: workerStats?.heapTotalBytes || 0,
    externalBytes: workerStats?.externalBytes || 0,
    arrayBuffersBytes: workerStats?.arrayBuffersBytes || 0,
    uptimeSeconds: workerStats?.uptimeSeconds || 0,
    sampledAt: workerStats?.sampledAt || null
  };
}

export async function requestRuntimeSnapshot(config) {
  if (!isMultiCoreRuntimeEnabled(config)) {
    return buildSingleProcessRuntimeSnapshot(config);
  }

  const registryPath = getWorkerRegistryPath(config);
  if (!registryPath) {
    return buildSingleProcessRuntimeSnapshot(config);
  }

  try {
    if (!await fs.pathExists(registryPath)) {
      return buildSingleProcessRuntimeSnapshot(config);
    }

    const registry = await fs.readJson(registryPath);
    const workersMeta = Array.isArray(registry?.workers) ? registry.workers : [];
    if (workersMeta.length === 0) {
      return buildSingleProcessRuntimeSnapshot(config);
    }

    const workers = await Promise.all(
      workersMeta.map((workerMeta) => readWorkerRuntimeStats(workerMeta, config))
    );

    return buildRuntimeSummaryFromWorkers(workers, config);
  } catch {
    return buildSingleProcessRuntimeSnapshot(config);
  }
}
