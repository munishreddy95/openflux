import cluster from 'node:cluster';
import http from 'node:http';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { getConfig, initializeConfig } from './services/config.service.js';
import { initializeDb } from './services/db.service.js';
import { proxySocketUpgradeToControl } from './services/proxy.service.js';
import {
  getControlPort,
  getControlPortEnvKey,
  getPublicPort,
  getPublicPortEnvKey,
  getRuntimeRole,
  getRuntimeRoleEnvKey,
  initializeRuntimeSupervisor,
  initializeRuntimeTelemetry,
  isControlRuntime,
  isMultiCoreRuntimeConfigured,
  isMultiCoreRuntimeEnabled,
  isWebRuntime,
  registerSupervisorWorker,
  RUNTIME_ROLE
} from './services/runtime.service.js';
import { initializeSocketService } from './services/socket.service.js';
import { initializeTorrentService, shutdownTorrentService } from './services/torrent.service.js';

const runtimeEntryPath = fileURLToPath(import.meta.url);
const socketServerOptions = {
  cors: {
    origin: true,
    credentials: true
  }
};

let httpServer = null;
let ioServer = null;
let internalHttpServer = null;
let internalIoServer = null;
let supervisorStarted = false;
let supervisorShuttingDown = false;
let workerSignalHandlersRegistered = false;
let supervisorSignalHandlersRegistered = false;

const supervisorWorkerRoles = new Map();

function createSocketServer(server) {
  const socketServer = new Server(server, socketServerOptions);
  initializeSocketService(socketServer);
  return socketServer;
}

async function closeHttpServer(server) {
  if (!server) {
    return;
  }

  await new Promise((resolve) => server.close(resolve));
}

async function closeSocketServer(server) {
  if (!server) {
    return;
  }

  await new Promise((resolve) => server.close(() => resolve()));
}

async function listenServer(server, port, host) {
  await new Promise((resolve, reject) => {
    const handleError = (error) => {
      server.off('listening', handleListening);
      reject(error);
    };
    const handleListening = () => {
      server.off('error', handleError);
      resolve();
    };

    server.once('error', handleError);
    server.once('listening', handleListening);
    server.listen(port, host);
  });
}

async function reserveLoopbackPort() {
  const probeServer = http.createServer();
  await listenServer(probeServer, 0, '127.0.0.1');
  const address = probeServer.address();
  await closeHttpServer(probeServer);
  return typeof address === 'object' && address ? address.port : null;
}

async function findAvailablePort(startPort, host, { maxAttempts = 50 } = {}) {
  let candidatePort = Number(startPort);

  if (!Number.isInteger(candidatePort) || candidatePort <= 0) {
    throw new Error(`Invalid startup port: ${startPort}`);
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const probeServer = http.createServer();

    try {
      await listenServer(probeServer, candidatePort, host);
      const address = probeServer.address();
      await closeHttpServer(probeServer);
      return typeof address === 'object' && address ? address.port : candidatePort;
    } catch (error) {
      await closeHttpServer(probeServer).catch(() => {});

      if (error?.code !== 'EADDRINUSE') {
        throw error;
      }

      candidatePort += 1;
    }
  }

  throw new Error(`Unable to find an available port starting from ${startPort}`);
}

function applyResolvedPort(config, port) {
  const resolvedPort = Number(port);

  if (!Number.isInteger(resolvedPort) || resolvedPort <= 0) {
    return false;
  }

  const requestedPort = Number(config.port);
  config.port = resolvedPort;
  return resolvedPort !== requestedPort;
}

function logResolvedPortChange(config, requestedPort) {
  if (requestedPort === config.port) {
    return;
  }

  console.log(
    chalk.yellow(
      `Port ${requestedPort} is already in use. OpenFlux is using ${config.port} instead.`
    )
  );
}

async function shutdownWorkerRuntime() {
  await closeSocketServer(internalIoServer);
  await closeSocketServer(ioServer);
  await closeHttpServer(internalHttpServer);
  await closeHttpServer(httpServer);
  await shutdownTorrentService();
}

function setupWorkerSignalHandlers() {
  if (workerSignalHandlersRegistered) {
    return;
  }

  const shutdown = async () => {
    await shutdownWorkerRuntime();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  workerSignalHandlersRegistered = true;
}

async function shutdownSupervisor() {
  if (supervisorShuttingDown) {
    return;
  }

  supervisorShuttingDown = true;
  console.log(chalk.yellow('\nShutting down OpenFlux...'));

  const workers = Object.values(cluster.workers || {});

  await Promise.all(workers.map((worker) => new Promise((resolve) => {
    if (!worker) {
      resolve();
      return;
    }

    worker.once('exit', () => resolve());
    worker.kill('SIGTERM');

    setTimeout(() => {
      if (!worker.isDead()) {
        worker.kill('SIGKILL');
      }
    }, 5000).unref?.();
  })));

  process.exit(0);
}

function setupSupervisorSignalHandlers() {
  if (supervisorSignalHandlersRegistered) {
    return;
  }

  process.once('SIGINT', shutdownSupervisor);
  process.once('SIGTERM', shutdownSupervisor);
  supervisorSignalHandlersRegistered = true;
}

function logWorkerReady(role, config) {
  if (role === RUNTIME_ROLE.control) {
    console.log(chalk.gray(`OpenFlux control worker ${process.pid} ready on ${config.host}:${config.port}`));
    return;
  }

  if (role === RUNTIME_ROLE.web) {
    console.log(chalk.gray(`OpenFlux web worker ${process.pid} ready on ${config.host}:${config.port}`));
  }
}

async function startSingleProcessRuntime(config) {
  const requestedPort = config.port;
  const resolvedPort = await findAvailablePort(config.port, config.host);
  applyResolvedPort(config, resolvedPort);

  await initializeDb(config.dbPath);
  initializeRuntimeTelemetry();
  await initializeTorrentService();

  const app = createApp({ workerRole: RUNTIME_ROLE.single });
  httpServer = http.createServer(app);
  ioServer = createSocketServer(httpServer);

  await listenServer(httpServer, config.port, config.host);
  setupWorkerSignalHandlers();

  logResolvedPortChange(config, requestedPort);
  console.log(chalk.green('OpenFlux is running'));
  console.log(chalk.cyan(`Dashboard: http://${config.host}:${config.port}`));
  console.log(chalk.gray(`Storage: ${config.storageDir}`));
  console.log(chalk.gray(`Downloads: ${config.downloadDir}`));
  console.log(chalk.gray('Runtime: single-process'));

  return { server: httpServer, config };
}

async function startControlWorkerRuntime(config) {
  const controlPort = getControlPort();
  const assignedPublicPort = getPublicPort();

  if (assignedPublicPort) {
    config.port = assignedPublicPort;
  }

  await initializeDb(config.dbPath);
  initializeRuntimeTelemetry();
  await initializeTorrentService();

  const internalApp = createApp({
    workerRole: RUNTIME_ROLE.control,
    controlPort: null
  });

  internalHttpServer = http.createServer(internalApp);
  internalIoServer = createSocketServer(internalHttpServer);
  await listenServer(internalHttpServer, controlPort, '127.0.0.1');

  const publicApp = createApp({
    workerRole: RUNTIME_ROLE.web,
    controlPort
  });

  httpServer = http.createServer(publicApp);
  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/socket.io')) {
      proxySocketUpgradeToControl(request, socket, head, controlPort);
      return;
    }

    socket.destroy();
  });

  await listenServer(httpServer, config.port, config.host);

  setupWorkerSignalHandlers();
  logWorkerReady(RUNTIME_ROLE.control, config);

  return { server: httpServer, config };
}

async function startWebWorkerRuntime(config) {
  const controlPort = getControlPort();
  const assignedPublicPort = getPublicPort();

  if (assignedPublicPort) {
    config.port = assignedPublicPort;
  }

  await initializeDb(config.dbPath);
  initializeRuntimeTelemetry();

  const app = createApp({
    workerRole: RUNTIME_ROLE.web,
    controlPort
  });

  httpServer = http.createServer(app);
  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/socket.io')) {
      proxySocketUpgradeToControl(request, socket, head, controlPort);
      return;
    }

    socket.destroy();
  });

  await listenServer(httpServer, config.port, config.host);
  setupWorkerSignalHandlers();
  logWorkerReady(RUNTIME_ROLE.web, config);

  return { server: httpServer, config };
}

function forkRuntimeWorker(role, controlPort, publicPort) {
  const worker = cluster.fork({
    [getRuntimeRoleEnvKey()]: role,
    [getControlPortEnvKey()]: String(controlPort),
    [getPublicPortEnvKey()]: String(publicPort)
  });

  supervisorWorkerRoles.set(worker.id, role);
  registerSupervisorWorker(worker, { role });
  return worker;
}

async function startMultiCoreSupervisor(config) {
  if (supervisorStarted) {
    return { server: null, config: getConfig() };
  }

  supervisorStarted = true;
  const requestedPort = config.port;
  const resolvedPort = await findAvailablePort(config.port, config.host);
  applyResolvedPort(config, resolvedPort);
  initializeRuntimeSupervisor(config);

  const controlPort = await reserveLoopbackPort();
  cluster.setupPrimary({
    exec: runtimeEntryPath
  });

  forkRuntimeWorker(RUNTIME_ROLE.control, controlPort, config.port);

  for (let workerIndex = 1; workerIndex < config.runtimeCoreCount; workerIndex += 1) {
    forkRuntimeWorker(RUNTIME_ROLE.web, controlPort, config.port);
  }

  cluster.on('exit', (worker, code, signal) => {
    const role = supervisorWorkerRoles.get(worker.id);
    supervisorWorkerRoles.delete(worker.id);

    if (supervisorShuttingDown || !role) {
      return;
    }

    console.log(
      chalk.yellow(
        `OpenFlux ${role} worker ${worker.process.pid} exited (${signal || code}). Restarting ${role} worker...`
      )
    );

    forkRuntimeWorker(role, controlPort, config.port);
  });

  setupSupervisorSignalHandlers();

  logResolvedPortChange(config, requestedPort);
  console.log(chalk.green('OpenFlux multi-core runtime is running'));
  console.log(chalk.cyan(`Dashboard: http://${config.host}:${config.port}`));
  console.log(chalk.gray(`Storage: ${config.storageDir}`));
  console.log(chalk.gray(`Downloads: ${config.downloadDir}`));
  console.log(
    chalk.gray(
      `Runtime: ${config.runtimeCoreCount} processes ` +
      `(1 control worker + ${Math.max(0, config.runtimeCoreCount - 1)} web workers)`
    )
  );

  return { server: null, config };
}

export async function startServer(options = {}) {
  if (httpServer || supervisorStarted) {
    return { server: httpServer, config: getConfig() };
  }

  const config = await initializeConfig(options, {
    persist: !cluster.isWorker
  });

  if (cluster.isPrimary && isMultiCoreRuntimeConfigured(config)) {
    await initializeDb(config.dbPath);
    return startMultiCoreSupervisor(config);
  }

  if (isWebRuntime()) {
    return startWebWorkerRuntime(config);
  }

  if (cluster.isWorker && isControlRuntime() && isMultiCoreRuntimeConfigured(config)) {
    return startControlWorkerRuntime(config);
  }

  return startSingleProcessRuntime(config);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer().catch((error) => {
    console.error(chalk.red(`Failed to start OpenFlux: ${error.message}`));
    process.exit(1);
  });
}
