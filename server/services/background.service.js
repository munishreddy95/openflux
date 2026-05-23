import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import fsExtra from 'fs-extra';

const BACKGROUND_PID_FILENAME = 'openflux.pid';
const BACKGROUND_RUNTIME_FILENAME = 'openflux.runtime.json';
const STDOUT_LOG_FILENAME = 'openflux.out.log';
const STDERR_LOG_FILENAME = 'openflux.err.log';
const STOP_POLL_INTERVAL_MS = 150;
const DEFAULT_STOP_TIMEOUT_MS = 7000;

let pidCleanupRegistered = false;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parsePid(rawValue) {
  if (!rawValue) {
    return null;
  }

  const parsedPid = Number.parseInt(String(rawValue).trim(), 10);
  return Number.isInteger(parsedPid) && parsedPid > 0 ? parsedPid : null;
}

export function getBackgroundPaths(config) {
  return {
    pidPath: path.join(config.storageDir, BACKGROUND_PID_FILENAME),
    runtimePath: path.join(config.storageDir, BACKGROUND_RUNTIME_FILENAME),
    stdoutLogPath: path.join(config.logsDir, STDOUT_LOG_FILENAME),
    stderrLogPath: path.join(config.logsDir, STDERR_LOG_FILENAME)
  };
}

export function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

async function readPidFile(pidPath) {
  if (!(await fsExtra.pathExists(pidPath))) {
    return null;
  }

  return parsePid(await fsExtra.readFile(pidPath, 'utf8'));
}

export async function writeBackgroundPid(config, pid) {
  const { pidPath } = getBackgroundPaths(config);
  await fsExtra.writeFile(pidPath, `${pid}\n`, 'utf8');
}

export async function clearBackgroundPid(config) {
  const { pidPath } = getBackgroundPaths(config);
  await fsExtra.remove(pidPath);
}

export async function writeBackgroundRuntimeInfo(config, runtimeInfo) {
  const { runtimePath } = getBackgroundPaths(config);
  await fsExtra.writeJson(runtimePath, runtimeInfo, { spaces: 2 });
}

export async function readBackgroundRuntimeInfo(config) {
  const { runtimePath } = getBackgroundPaths(config);

  if (!(await fsExtra.pathExists(runtimePath))) {
    return null;
  }

  return fsExtra.readJson(runtimePath);
}

export async function clearBackgroundRuntimeInfo(config) {
  const { runtimePath } = getBackgroundPaths(config);
  await fsExtra.remove(runtimePath);
}

export async function getBackgroundProcessState(config) {
  const paths = getBackgroundPaths(config);
  const pid = await readPidFile(paths.pidPath);
  const runtime = await readBackgroundRuntimeInfo(config);

  if (!pid) {
    return {
      ...paths,
      pid: null,
      running: false,
      stale: false,
      runtime
    };
  }

  const running = isProcessRunning(pid);

  if (!running) {
    await fsExtra.remove(paths.pidPath);
    await fsExtra.remove(paths.runtimePath);
  }

  return {
    ...paths,
    pid,
    running,
    stale: !running,
    runtime: running ? runtime : null
  };
}

export function registerBackgroundPidCleanup(config, { enabled = false } = {}) {
  if (!enabled || pidCleanupRegistered) {
    return;
  }

  const { pidPath } = getBackgroundPaths(config);

  process.once('exit', () => {
    try {
      const rawValue = fs.readFileSync(pidPath, 'utf8');
      const storedPid = parsePid(rawValue);

      if (storedPid === process.pid) {
        fs.rmSync(pidPath, { force: true });
        fs.rmSync(getBackgroundPaths(config).runtimePath, { force: true });
      }
    } catch {
      // Ignore pid cleanup errors during shutdown.
    }
  });

  pidCleanupRegistered = true;
}

export async function spawnDetachedProcess({
  command,
  args,
  cwd,
  env,
  stdoutPath,
  stderrPath
}) {
  return new Promise((resolve, reject) => {
    let stdoutFd = null;
    let stderrFd = null;

    try {
      stdoutFd = fs.openSync(stdoutPath, 'a');
      stderrFd = fs.openSync(stderrPath, 'a');
    } catch (error) {
      if (stdoutFd !== null) {
        fs.closeSync(stdoutFd);
      }

      if (stderrFd !== null) {
        fs.closeSync(stderrFd);
      }

      reject(error);
      return;
    }

    const child = spawn(command, args, {
      cwd,
      env,
      detached: true,
      stdio: ['ignore', stdoutFd, stderrFd]
    });

    const closeParentDescriptors = () => {
      if (stdoutFd !== null) {
        fs.closeSync(stdoutFd);
        stdoutFd = null;
      }

      if (stderrFd !== null) {
        fs.closeSync(stderrFd);
        stderrFd = null;
      }
    };

    child.once('error', (error) => {
      closeParentDescriptors();
      reject(error);
    });

    child.once('spawn', () => {
      closeParentDescriptors();
      child.unref();
      resolve(child.pid);
    });
  });
}

export async function stopBackgroundProcess(config, { force = false } = {}) {
  const state = await getBackgroundProcessState(config);

  if (!state.pid || !state.running) {
    return {
      ...state,
      stopped: false,
      alreadyStopped: true,
      timedOut: false
    };
  }

  process.kill(state.pid, force ? 'SIGKILL' : 'SIGTERM');

  const timeoutAt = Date.now() + DEFAULT_STOP_TIMEOUT_MS;

  while (Date.now() < timeoutAt) {
    if (!isProcessRunning(state.pid)) {
      await clearBackgroundPid(config);
      await clearBackgroundRuntimeInfo(config);
      return {
        ...state,
        running: false,
        stopped: true,
        alreadyStopped: false,
        timedOut: false
      };
    }

    await sleep(STOP_POLL_INTERVAL_MS);
  }

  return {
    ...state,
    stopped: false,
    alreadyStopped: false,
    timedOut: true
  };
}
