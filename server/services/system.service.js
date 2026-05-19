import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { statfs } from 'node:fs/promises';
import { getConfig } from './config.service.js';
import { requestRuntimeSnapshot } from './runtime.service.js';

const CPU_SAMPLE_INTERVAL_MS = 1000;
const DIRECTORY_USAGE_CACHE_TTL_MS = 15000;
const directoryUsageCache = new Map();

let lastProcessCpuUsage = process.cpuUsage();
let lastSampleTime = process.hrtime.bigint();
let lastSystemCpuSnapshot = getSystemCpuSnapshot();
let latestCpuSample = {
  sampledAt: new Date().toISOString(),
  processCpuPercent: 0,
  systemCpuPercent: 0
};

function getSystemCpuSnapshot() {
  return os.cpus().reduce(
    (snapshot, cpu) => {
      const cpuTotal = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
      return {
        idle: snapshot.idle + cpu.times.idle,
        total: snapshot.total + cpuTotal
      };
    },
    { idle: 0, total: 0 }
  );
}

function roundUsage(value, max = 999.9) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Number(Math.min(max, value).toFixed(1));
}

function sampleCpuUsage() {
  const now = process.hrtime.bigint();
  const elapsedMicroseconds = Math.max(Number(now - lastSampleTime) / 1000, 1);
  const processDelta = process.cpuUsage(lastProcessCpuUsage);
  const processUsedMicroseconds = processDelta.user + processDelta.system;
  const nextSystemSnapshot = getSystemCpuSnapshot();
  const idleDelta = nextSystemSnapshot.idle - lastSystemCpuSnapshot.idle;
  const totalDelta = nextSystemSnapshot.total - lastSystemCpuSnapshot.total;

  latestCpuSample = {
    sampledAt: new Date().toISOString(),
    processCpuPercent: roundUsage((processUsedMicroseconds / elapsedMicroseconds) * 100),
    systemCpuPercent: totalDelta > 0
      ? roundUsage(((totalDelta - idleDelta) / totalDelta) * 100, 100)
      : latestCpuSample.systemCpuPercent
  };

  lastProcessCpuUsage = process.cpuUsage();
  lastSampleTime = now;
  lastSystemCpuSnapshot = nextSystemSnapshot;
}

const cpuSampler = setInterval(sampleCpuUsage, CPU_SAMPLE_INTERVAL_MS);
cpuSampler.unref?.();

async function calculateDirectorySize(directoryPath) {
  if (!await fs.pathExists(directoryPath)) {
    return 0;
  }

  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  let totalSize = 0;

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      totalSize += await calculateDirectorySize(entryPath);
      continue;
    }

    if (entry.isFile()) {
      const stats = await fs.stat(entryPath);
      totalSize += stats.size;
    }
  }

  return totalSize;
}

async function getCachedDirectoryUsage(directoryPath) {
  const cachedUsage = directoryUsageCache.get(directoryPath);
  const now = Date.now();

  if (cachedUsage?.promise) {
    return cachedUsage.promise;
  }

  if (cachedUsage && now - cachedUsage.sampledAt < DIRECTORY_USAGE_CACHE_TTL_MS) {
    return cachedUsage;
  }

  const usagePromise = calculateDirectorySize(directoryPath)
    .then((bytes) => {
      const nextUsage = {
        path: directoryPath,
        bytes,
        sampledAt: Date.now()
      };
      directoryUsageCache.set(directoryPath, nextUsage);
      return nextUsage;
    })
    .catch((error) => {
      directoryUsageCache.delete(directoryPath);
      throw error;
    });

  directoryUsageCache.set(directoryPath, {
    path: directoryPath,
    bytes: cachedUsage?.bytes || 0,
    sampledAt: cachedUsage?.sampledAt || 0,
    promise: usagePromise
  });

  return usagePromise;
}

async function getDiskUsage(directoryPath) {
  const stats = await statfs(directoryPath);
  const blockSize = Number(stats.bsize || stats.frsize || 0);
  const totalBytes = blockSize * Number(stats.blocks || 0);
  const freeBytes = blockSize * Number(stats.bavail || stats.bfree || 0);
  const usedBytes = Math.max(0, totalBytes - freeBytes);

  return {
    path: directoryPath,
    totalBytes,
    usedBytes,
    freeBytes,
    usagePercent: totalBytes > 0 ? roundUsage((usedBytes / totalBytes) * 100, 100) : 0
  };
}

function getMemoryBreakdown() {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  const usedBytes = Math.max(0, totalBytes - freeBytes);

  return {
    totalBytes,
    freeBytes,
    usedBytes,
    usagePercent: totalBytes > 0 ? roundUsage((usedBytes / totalBytes) * 100, 100) : 0
  };
}

export async function getSystemUsage() {
  const config = getConfig();
  const hostMemory = getMemoryBreakdown();
  const runtimeSnapshot = await requestRuntimeSnapshot(config);
  const [storageUsage, downloadUsage, diskUsage] = await Promise.all([
    getCachedDirectoryUsage(config.storageDir),
    getCachedDirectoryUsage(config.downloadDir),
    getDiskUsage(config.storageDir)
  ]);

  return {
    sampledAt: runtimeSnapshot.sampledAt || latestCpuSample.sampledAt,
    runtime: runtimeSnapshot,
    process: {
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
      cpuPercent: runtimeSnapshot.totalCpuPercent,
      memoryBytes: runtimeSnapshot.totalMemoryBytes,
      heapUsedBytes: runtimeSnapshot.totalHeapUsedBytes,
      heapTotalBytes: runtimeSnapshot.totalHeapTotalBytes,
      externalBytes: runtimeSnapshot.totalExternalBytes,
      arrayBuffersBytes: runtimeSnapshot.totalArrayBuffersBytes,
      memoryUsagePercent: hostMemory.totalBytes > 0
        ? roundUsage((runtimeSnapshot.totalMemoryBytes / hostMemory.totalBytes) * 100, 100)
        : 0
    },
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      uptimeSeconds: Math.floor(os.uptime()),
      cpuCores: os.cpus().length,
      cpuPercent: latestCpuSample.systemCpuPercent,
      loadAverage: os.loadavg().map((value) => Number(value.toFixed(2))),
      memoryTotalBytes: hostMemory.totalBytes,
      memoryFreeBytes: hostMemory.freeBytes,
      memoryUsedBytes: hostMemory.usedBytes,
      memoryUsagePercent: hostMemory.usagePercent
    },
    disk: {
      storageDir: config.storageDir,
      downloadDir: config.downloadDir,
      openFluxUsedBytes: storageUsage.bytes,
      downloadUsedBytes: downloadUsage.bytes,
      totalBytes: diskUsage.totalBytes,
      usedBytes: diskUsage.usedBytes,
      freeBytes: diskUsage.freeBytes,
      usagePercent: diskUsage.usagePercent
    }
  };
}
