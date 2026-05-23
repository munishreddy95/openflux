#!/usr/bin/env node

import cluster from 'node:cluster';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { Command } from 'commander';
import { startServer } from '../server/server.js';
import { initializeDb } from '../server/services/db.service.js';
import { createAdminUser } from '../server/services/auth.service.js';
import {
  clearBackgroundRuntimeInfo,
  clearBackgroundPid,
  getBackgroundPaths,
  getBackgroundProcessState,
  isProcessRunning,
  readBackgroundRuntimeInfo,
  registerBackgroundPidCleanup,
  spawnDetachedProcess,
  stopBackgroundProcess,
  writeBackgroundRuntimeInfo,
  writeBackgroundPid
} from '../server/services/background.service.js';
import { getPackageInfo, initializeConfig } from '../server/services/config.service.js';

const packageInfo = getPackageInfo();
const program = new Command();
const cliEntryPath = fileURLToPath(import.meta.url);
const BACKGROUND_ENV_KEY = 'OPENFLUX_BACKGROUND_CHILD';

function buildStartArgs(options) {
  const args = [
    'start',
    '--host', options.host,
    '--port', String(options.port)
  ];

  if (options.cores) {
    args.push('--cores', String(options.cores));
  }

  if (options.downloadDir) {
    args.push('--download-dir', options.downloadDir);
  }

  return args;
}

function getDashboardUrl(config) {
  return `http://${config.host}:${config.port}`;
}

function getDashboardUrlFromRuntime(runtimeInfo) {
  return runtimeInfo?.host && runtimeInfo?.port
    ? `http://${runtimeInfo.host}:${runtimeInfo.port}`
    : null;
}

function isBackgroundOwnerProcess() {
  return process.env[BACKGROUND_ENV_KEY] === '1' && !cluster.isWorker;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

program
  .name('openflux')
  .description('OpenFlux self-hosted web torrent downloader')
  .showHelpAfterError()
  .showSuggestionAfterError()
  .version(packageInfo.version);

program
  .command('version')
  .description('Print current package version')
  .action(() => {
    console.log(packageInfo.version);
  });

program
  .command('start')
  .description('Start the OpenFlux server')
  .option('--host <host>', 'Host to bind', 'localhost')
  .option('--port <port>', 'Port to bind', '8080')
  .option('--cores <count>', 'Configured startup core count')
  .option('--download-dir <path>', 'Custom download directory')
  .option('--detach', 'Start OpenFlux in the background')
  .option('--background', 'Alias for --detach')
  .action(async (options) => {
    try {
      const detachRequested = Boolean(options.detach || options.background);

      if (detachRequested) {
        const config = await initializeConfig({
          host: options.host,
          port: options.port,
          runtimeCoreCount: options.cores,
          downloadDir: options.downloadDir
        });
        const currentState = await getBackgroundProcessState(config);

        if (currentState.running) {
          console.log(chalk.yellow(`OpenFlux is already running in the background (PID ${currentState.pid})`));
          console.log(
            chalk.cyan(
              `Dashboard: ${getDashboardUrlFromRuntime(currentState.runtime) || getDashboardUrl(config)}`
            )
          );
          console.log(chalk.gray(`Stdout log: ${currentState.stdoutLogPath}`));
          console.log(chalk.gray(`Stderr log: ${currentState.stderrLogPath}`));
          return;
        }

        const { stdoutLogPath, stderrLogPath } = getBackgroundPaths(config);
        const childPid = await spawnDetachedProcess({
          command: process.execPath,
          args: [cliEntryPath, ...buildStartArgs(options)],
          cwd: process.cwd(),
          env: {
            ...process.env,
            [BACKGROUND_ENV_KEY]: '1'
          },
          stdoutPath: stdoutLogPath,
          stderrPath: stderrLogPath
        });

        await writeBackgroundPid(config, childPid);
        await sleep(750);

        if (!isProcessRunning(childPid)) {
          await clearBackgroundPid(config);
          await clearBackgroundRuntimeInfo(config);
          console.log(chalk.red('OpenFlux background start failed during early startup'));
          console.log(chalk.gray(`Check stderr log: ${stderrLogPath}`));
          process.exitCode = 1;
          return;
        }

        const runtimeInfo = await readBackgroundRuntimeInfo(config);
        console.log(chalk.green('OpenFlux started in background mode'));
        console.log(chalk.cyan(`Dashboard: ${getDashboardUrlFromRuntime(runtimeInfo) || getDashboardUrl(config)}`));
        console.log(chalk.gray(`PID: ${childPid}`));
        console.log(chalk.gray(`Stdout log: ${stdoutLogPath}`));
        console.log(chalk.gray(`Stderr log: ${stderrLogPath}`));
        console.log(chalk.gray('Manage it with: openflux status | openflux stop'));
        return;
      }

      if (isBackgroundOwnerProcess()) {
        const config = await initializeConfig({
          host: options.host,
          port: options.port,
          runtimeCoreCount: options.cores,
          downloadDir: options.downloadDir
        }, {
          persist: !cluster.isWorker
        });

        registerBackgroundPidCleanup(config, { enabled: true });
      }

      const runtime = await startServer({
        host: options.host,
        port: options.port,
        runtimeCoreCount: options.cores,
        downloadDir: options.downloadDir
      });

      if (isBackgroundOwnerProcess() && runtime?.config) {
        await writeBackgroundRuntimeInfo(runtime.config, {
          pid: process.pid,
          host: runtime.config.host,
          port: runtime.config.port,
          startedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(chalk.red(`OpenFlux failed to start: ${error.message}`));
      process.exitCode = 1;
    }
  });

program
  .command('status')
  .description('Show detached OpenFlux process status')
  .action(async () => {
    try {
      const config = await initializeConfig({}, { persist: false });
      const state = await getBackgroundProcessState(config);

      if (!state.running) {
        console.log(chalk.yellow('OpenFlux is not running in background mode'));
        console.log(chalk.gray(`Expected pid file: ${state.pidPath}`));
        console.log(chalk.gray(`Stdout log: ${state.stdoutLogPath}`));
        console.log(chalk.gray(`Stderr log: ${state.stderrLogPath}`));
        return;
      }

      console.log(chalk.green('OpenFlux background process is running'));
      console.log(
        chalk.cyan(
          `Dashboard: ${getDashboardUrlFromRuntime(state.runtime) || getDashboardUrl(config)}`
        )
      );
      console.log(chalk.gray(`PID: ${state.pid}`));
      console.log(chalk.gray(`Runtime cores: ${config.runtimeCoreCount}`));
      console.log(chalk.gray(`Stdout log: ${state.stdoutLogPath}`));
      console.log(chalk.gray(`Stderr log: ${state.stderrLogPath}`));
    } catch (error) {
      console.error(chalk.red(`Unable to read OpenFlux status: ${error.message}`));
      process.exitCode = 1;
    }
  });

program
  .command('stop')
  .description('Stop the detached OpenFlux process')
  .option('--force', 'Force-stop the process if it does not exit cleanly')
  .action(async (options) => {
    try {
      const config = await initializeConfig({}, { persist: false });
      const result = await stopBackgroundProcess(config, {
        force: Boolean(options.force)
      });

      if (result.alreadyStopped) {
        console.log(chalk.yellow('OpenFlux is not running in background mode'));
        return;
      }

      if (result.timedOut) {
        console.log(chalk.red(`OpenFlux did not stop within the timeout window (PID ${result.pid})`));
        console.log(chalk.gray('Try again with: openflux stop --force'));
        process.exitCode = 1;
        return;
      }

      console.log(chalk.green(`OpenFlux background process ${result.pid} stopped`));
    } catch (error) {
      console.error(chalk.red(`Unable to stop OpenFlux: ${error.message}`));
      process.exitCode = 1;
    }
  });

program
  .command('config')
  .description('Print current OpenFlux configuration')
  .option('--host <host>', 'Override configured host')
  .option('--port <port>', 'Override configured port')
  .option('--cores <count>', 'Override configured startup core count')
  .option('--download-dir <path>', 'Override configured download directory')
  .action(async (options) => {
    try {
      const config = await initializeConfig({
        host: options.host,
        port: options.port,
        runtimeCoreCount: options.cores,
        downloadDir: options.downloadDir
      });
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(chalk.red(`Unable to read configuration: ${error.message}`));
      process.exitCode = 1;
    }
  });

const adminProgram = program
  .command('admin')
  .description('Manage OpenFlux admin accounts');

adminProgram
  .command('create')
  .description('Create an admin account in the OpenFlux database')
  .requiredOption('--username <username>', 'Admin username')
  .option('--password <password>', 'Admin password. If omitted, OpenFlux generates a temporary one.')
  .action(async (options) => {
    try {
      const config = await initializeConfig({}, { persist: false });
      await initializeDb(config.dbPath);
      const result = await createAdminUser({
        username: options.username,
        password: options.password
      });

      console.log(chalk.green(`Admin account "${result.user.username}" created.`));

      if (result.generatedPassword) {
        console.log(chalk.yellow('No password was provided. OpenFlux generated a temporary password that must be changed after login:'));
        console.log(chalk.cyan(result.password));
      }
    } catch (error) {
      console.error(chalk.red(`Unable to create admin account: ${error.message}`));
      process.exitCode = 1;
    }
  });

program
  .command('help')
  .description('Show CLI help')
  .action(() => {
    program.outputHelp();
  });

if (process.argv.length <= 2) {
  program.outputHelp();
} else {
  await program.parseAsync(process.argv);
}
