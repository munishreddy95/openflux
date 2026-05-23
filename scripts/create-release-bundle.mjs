import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');
const fsExtra = require('fs-extra');

const { copy, ensureDir, emptyDir, pathExists } = fsExtra;

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const REQUIRED_ENTRIES = [
  'bin',
  'server',
  'public',
  'node_modules',
  'package.json',
  'package-lock.json',
  'README.md',
  'PACKAGING.md',
  'CONTRIBUTING.md',
  'LEGAL_NOTICE.md',
  'SECURITY.md',
  'TROUBLESHOOTING.md',
  'LICENSE'
];

function getArgumentValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return null;
  }

  return process.argv[index + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function readPackageInfo() {
  const packagePath = path.join(ROOT_DIR, 'package.json');
  const content = await fsp.readFile(packagePath, 'utf8');
  return JSON.parse(content);
}

async function assertBundleInputs() {
  const missingEntries = [];

  for (const entry of REQUIRED_ENTRIES) {
    if (!(await pathExists(path.join(ROOT_DIR, entry)))) {
      missingEntries.push(entry);
    }
  }

  if (missingEntries.length > 0) {
    throw new Error(`Bundle input is missing: ${missingEntries.join(', ')}`);
  }

  if (!(await pathExists(path.join(ROOT_DIR, 'public', 'index.html')))) {
    throw new Error('Frontend build output is missing. Run "npm run build" first.');
  }
}

async function copyProjectFiles(bundleDir) {
  for (const entry of REQUIRED_ENTRIES) {
    await copy(path.join(ROOT_DIR, entry), path.join(bundleDir, entry), {
      dereference: true
    });
  }
}

function createPosixLauncher() {
  return `#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
NODE_BIN="$SCRIPT_DIR/runtime/node"

if [ ! -x "$NODE_BIN" ]; then
  NODE_BIN="\${OPENFLUX_NODE_BIN:-node}"
fi

exec "$NODE_BIN" "$SCRIPT_DIR/bin/openflux.js" "$@"
`;
}

function createWindowsLauncher() {
  return `@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "NODE_BIN=%SCRIPT_DIR%runtime\\node.exe"

if exist "%NODE_BIN%" (
  "%NODE_BIN%" "%SCRIPT_DIR%bin\\openflux.js" %*
) else (
  node "%SCRIPT_DIR%bin\\openflux.js" %*
)
`;
}

function createWindowsStartScript() {
  return `@echo off
setlocal
title OpenFlux Server
echo Starting OpenFlux on http://localhost:8080
echo Press Ctrl+C in this window to stop the server.
echo.
call "%~dp0openflux.cmd" start --host localhost --port 8080
echo.
echo OpenFlux has stopped.
pause
`;
}

function createWindowsConfigScript() {
  return `@echo off
setlocal
call "%~dp0openflux.cmd" config
echo.
pause
`;
}

function createStartHereFile({ version, platform, arch, launcherName }) {
  const startupCommand = platform === 'win32'
    ? `${launcherName} start --host 0.0.0.0 --port 4001`
    : `./${launcherName} start --host 0.0.0.0 --port 4001`;

  return `OpenFlux ${version}
Platform: ${platform}
Architecture: ${arch}

This bundle includes:
- OpenFlux server files
- Built frontend assets
- Installed production dependencies
- A bundled Node.js runtime for this platform

Quick start:
1. Extract the zip archive.
2. Open a terminal in this folder.
3. Run:
   ${startupCommand}
4. Open the printed URL in your browser.

Notes:
- OpenFlux stores data in the current user's home directory under .openflux.
- Build a separate bundle on each target OS and CPU architecture.
- This is the supported release format. A single native .exe is not guaranteed with the current dependency stack.
`;
}

async function copyNodeRuntime(bundleDir, platform) {
  const runtimeDir = path.join(bundleDir, 'runtime');
  const runtimeName = platform === 'win32' ? 'node.exe' : 'node';
  const sourceNodePath = await fsp.realpath(process.execPath);
  const targetNodePath = path.join(runtimeDir, runtimeName);

  await ensureDir(runtimeDir);
  await copy(sourceNodePath, targetNodePath, { dereference: true });

  if (platform !== 'win32') {
    await fsp.chmod(targetNodePath, 0o755);
  }
}

async function writeLaunchers(bundleDir, platform) {
  if (platform === 'win32') {
    await fsp.writeFile(path.join(bundleDir, 'openflux.cmd'), createWindowsLauncher(), 'utf8');
    return 'openflux.cmd';
  }

  const launcherPath = path.join(bundleDir, 'openflux');
  await fsp.writeFile(launcherPath, createPosixLauncher(), 'utf8');
  await fsp.chmod(launcherPath, 0o755);
  return 'openflux';
}

async function writeBundleHelpers(bundleDir, platform) {
  if (platform !== 'win32') {
    return;
  }

  await fsp.writeFile(path.join(bundleDir, 'start-openflux.cmd'), createWindowsStartScript(), 'utf8');
  await fsp.writeFile(path.join(bundleDir, 'openflux-config.cmd'), createWindowsConfigScript(), 'utf8');
}

async function writeBundleMetadata(bundleDir, metadata) {
  await fsp.writeFile(
    path.join(bundleDir, 'bundle-info.json'),
    JSON.stringify(metadata, null, 2),
    'utf8'
  );
}

async function createZipArchive(bundleDir, archivePath) {
  await ensureDir(path.dirname(archivePath));

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(archivePath);
    const archive = new ZipArchive({
      zlib: { level: 9 }
    });

    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(bundleDir, path.basename(bundleDir));
    archive.finalize();
  });
}

async function main() {
  const packageInfo = await readPackageInfo();
  const platform = process.platform;
  const arch = process.arch;
  const skipArchive = hasFlag('--skip-archive');
  const outputDir = getArgumentValue('--output-dir') ?? DIST_DIR;
  const releaseName = `openflux-${packageInfo.version}-${platform}-${arch}`;
  const bundleDir = path.resolve(outputDir, releaseName);
  const archivePath = path.resolve(outputDir, `${releaseName}.zip`);

  await assertBundleInputs();
  await ensureDir(outputDir);
  await emptyDir(bundleDir);
  await copyProjectFiles(bundleDir);
  await copyNodeRuntime(bundleDir, platform);

  const launcherName = await writeLaunchers(bundleDir, platform);
  await writeBundleHelpers(bundleDir, platform);

  await fsp.writeFile(
    path.join(bundleDir, 'START_HERE.txt'),
    createStartHereFile({
      version: packageInfo.version,
      platform,
      arch,
      launcherName
    }),
    'utf8'
  );

  await writeBundleMetadata(bundleDir, {
    name: packageInfo.name,
    version: packageInfo.version,
    platform,
    arch,
    nodeVersion: process.version,
    nodeExecutable: process.execPath,
    createdAt: new Date().toISOString(),
    archive: skipArchive ? null : path.basename(archivePath)
  });

  if (!skipArchive) {
    await createZipArchive(bundleDir, archivePath);
  }

  console.log(`Bundle directory: ${bundleDir}`);

  if (!skipArchive) {
    console.log(`Zip archive: ${archivePath}`);
  }
}

main().catch((error) => {
  console.error(`Failed to create release bundle: ${error.message}`);
  process.exitCode = 1;
});
