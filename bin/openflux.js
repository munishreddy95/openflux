#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { startServer } from '../server/server.js';
import { getPackageInfo, initializeConfig } from '../server/services/config.service.js';

const packageInfo = getPackageInfo();
const program = new Command();

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
  .action(async (options) => {
    try {
      await startServer({
        host: options.host,
        port: options.port,
        runtimeCoreCount: options.cores,
        downloadDir: options.downloadDir
      });
    } catch (error) {
      console.error(chalk.red(`OpenFlux failed to start: ${error.message}`));
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
