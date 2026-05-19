import cluster from 'node:cluster';
import os from 'node:os';
import process from 'node:process';

export const RUNTIME_ROLE = {
  single: 'single',
  control: 'control',
  web: 'web'
};

const ROLE_ENV_KEY = 'OPENFLUX_RUNTIME_ROLE';
const CONTROL_PORT_ENV_KEY = 'OPENFLUX_CONTROL_PORT';
const REPORT_INTERVAL_MS = 1000;
const SNAPSHOT_TIMEOUT_MS = 2000;
const SUPERVISOR_MESSAGE = {
  workerStats: 'runtime:worker-stats',
  snapshotRequest: 'runtime:snapshot-request',
  snapshotResponse: 'runtime:snapshot-response'
};

let reportIntervalId = null;
let localStatsMessageListenerRegistered = false;
let lastProcessCpuUsage = process.cpuUsage();
let lastSampleTime = process.hrtime.bigint();
let snapshotRequestSequence = 0;
let supervisorConfig = null;

const supervisorWorkerMeta = new Map();
const supervisorWorkerStats = new Map();
const pendingRuntimeSnapshots = new Map();

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

export function isMultiCoreRuntimeEnabled(_config = null) {
  return getRuntimeRole() !== RUNTIME_ROLE.single;
}

export function getControlPort() {
  const controlPort = Number.parseInt(process.env[CONTROL_PORT_ENV_KEY] || '', 10);
  return Number.isInteger(controlPort) && controlPort > 0 ? controlPort : null;
}

function roundUsage(value, max = 999.9) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Number(Math.min(max, value).toFixed(1));
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

function sendWorkerStatsToSupervisor() {
  if (!cluster.isWorker || typeof process.send !== 'function') {
    return;
  }

  process.send({
    type: SUPERVISOR_MESSAGE.workerStats,
    payload: latestLocalRuntimeStats
  });
}

function handleWorkerRuntimeMessage(message = {}) {
  if (message.type !== SUPERVISOR_MESSAGE.snapshotResponse) {
    return;
  }

  const pendingRequest = pendingRuntimeSnapshots.get(message.requestId);
  if (!pendingRequest) {
    return;
  }

  clearTimeout(pendingRequest.timeoutId);
  pendingRuntimeSnapshots.delete(message.requestId);
  pendingRequest.resolve(message.payload);
}

export function initializeRuntimeTelemetry() {
  if (reportIntervalId) {
    return;
  }

  sampleLocalRuntimeStats();
  sendWorkerStatsToSupervisor();

  if (cluster.isWorker && typeof process.send === 'function' && !localStatsMessageListenerRegistered) {
    process.on('message', handleWorkerRuntimeMessage);
    localStatsMessageListenerRegistered = true;
  }

  reportIntervalId = setInterval(() => {
    sampleLocalRuntimeStats();
    sendWorkerStatsToSupervisor();
  }, REPORT_INTERVAL_MS);

  reportIntervalId.unref?.();
}

export function getLocalRuntimeStats() {
  return latestLocalRuntimeStats;
}

export function initializeRuntimeSupervisor(config) {
  supervisorConfig = config;
}

export function registerSupervisorWorker(worker, { role }) {
  supervisorWorkerMeta.set(worker.id, {
    workerId: worker.id,
    role,
    pid: worker.process?.pid || null
  });

  worker.on('message', (message = {}) => {
    if (message.type === SUPERVISOR_MESSAGE.workerStats) {
      supervisorWorkerStats.set(worker.id, {
        ...message.payload,
        workerId: worker.id,
        role
      });
      return;
    }

    if (message.type === SUPERVISOR_MESSAGE.snapshotRequest) {
      worker.send({
        type: SUPERVISOR_MESSAGE.snapshotResponse,
        requestId: message.requestId,
        payload: buildSupervisorRuntimeSnapshot()
      });
    }
  });

  worker.on('exit', () => {
    supervisorWorkerMeta.delete(worker.id);
    supervisorWorkerStats.delete(worker.id);
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
      role: getRuntimeRole()
    }
  ], config);
}

function buildSupervisorRuntimeSnapshot() {
  const workers = Array.from(supervisorWorkerMeta.values()).map((workerMeta) => {
    const latestStats = supervisorWorkerStats.get(workerMeta.workerId);
    return {
      pid: latestStats?.pid || workerMeta.pid || null,
      role: workerMeta.role,
      workerId: workerMeta.workerId,
      cpuPercent: latestStats?.cpuPercent || 0,
      memoryBytes: latestStats?.memoryBytes || 0,
      heapUsedBytes: latestStats?.heapUsedBytes || 0,
      heapTotalBytes: latestStats?.heapTotalBytes || 0,
      externalBytes: latestStats?.externalBytes || 0,
      arrayBuffersBytes: latestStats?.arrayBuffersBytes || 0,
      uptimeSeconds: latestStats?.uptimeSeconds || 0,
      sampledAt: latestStats?.sampledAt || null
    };
  });

  return buildRuntimeSummaryFromWorkers(workers, supervisorConfig);
}

export async function requestRuntimeSnapshot(config) {
  if (!cluster.isWorker || typeof process.send !== 'function' || !isMultiCoreRuntimeEnabled(config)) {
    return buildSingleProcessRuntimeSnapshot(config);
  }

  const requestId = `${process.pid}:${Date.now()}:${snapshotRequestSequence++}`;

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      pendingRuntimeSnapshots.delete(requestId);
      resolve(buildSingleProcessRuntimeSnapshot(config));
    }, SNAPSHOT_TIMEOUT_MS);

    pendingRuntimeSnapshots.set(requestId, {
      resolve,
      timeoutId
    });

    process.send({
      type: SUPERVISOR_MESSAGE.snapshotRequest,
      requestId
    });
  });
}
