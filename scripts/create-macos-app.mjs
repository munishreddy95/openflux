import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');
const fsExtra = require('fs-extra');

const { copy, emptyDir, ensureDir, pathExists, remove } = fsExtra;

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const INFO_TEMPLATE_PATH = path.join(ROOT_DIR, 'packaging', 'macos', 'Info.plist.tpl');

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
  const content = await fsp.readFile(path.join(ROOT_DIR, 'package.json'), 'utf8');
  return JSON.parse(content);
}

async function assertPathExists(targetPath, message) {
  if (!(await pathExists(targetPath))) {
    throw new Error(message);
  }
}

function renderTemplate(template, replacements) {
  return Object.entries(replacements).reduce((content, [key, value]) => {
    return content.replaceAll(`{{${key}}}`, value);
  }, template);
}

function createMacExecutable() {
  return `#!/bin/sh
set -eu

APP_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
COMMAND_SCRIPT="$APP_DIR/Resources/openflux/start-openflux.command"

if command -v open >/dev/null 2>&1; then
  open -a Terminal "$COMMAND_SCRIPT"
else
  exec "$COMMAND_SCRIPT"
fi
`;
}

function createMacCommandScript() {
  return `#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"

( sleep 2; open "http://localhost:8080" >/dev/null 2>&1 || true ) &

exec ./openflux start --host localhost --port 8080
`;
}

async function createZipArchive(sourceDir, archivePath) {
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
    archive.directory(sourceDir, path.basename(sourceDir));
    archive.finalize();
  });
}

async function runHdiutil(appDir, dmgPath) {
  await new Promise((resolve, reject) => {
    const child = spawn('hdiutil', [
      'create',
      '-volname',
      'OpenFlux',
      '-srcfolder',
      appDir,
      '-ov',
      '-format',
      'UDZO',
      dmgPath
    ], {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    });

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('hdiutil was not found. Run this step on macOS or omit --dmg.'));
        return;
      }

      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`hdiutil exited with code ${code}`));
    });
  });
}

async function main() {
  const packageInfo = await readPackageInfo();
  const arch = getArgumentValue('--arch') ?? process.arch;
  const outputDir = path.resolve(getArgumentValue('--output-dir') ?? DIST_DIR);
  const releaseName = `openflux-${packageInfo.version}-darwin-${arch}`;
  const bundleDir = path.resolve(
    getArgumentValue('--bundle-dir') ?? path.join(outputDir, releaseName)
  );
  const appDir = path.join(outputDir, 'OpenFlux.app');
  const contentsDir = path.join(appDir, 'Contents');
  const macOsDir = path.join(contentsDir, 'MacOS');
  const resourcesDir = path.join(contentsDir, 'Resources');
  const embeddedBundleDir = path.join(resourcesDir, 'openflux');
  const zipPath = path.join(outputDir, `${releaseName}-app.zip`);
  const dmgPath = path.join(outputDir, `${releaseName}.dmg`);
  const shouldCreateDmg = hasFlag('--dmg');

  await assertPathExists(
    INFO_TEMPLATE_PATH,
    'macOS Info.plist template is missing.'
  );
  await assertPathExists(
    bundleDir,
    `macOS bundle was not found at ${bundleDir}. Run "npm run bundle:current" on macOS first or pass --bundle-dir.`
  );
  await assertPathExists(
    path.join(bundleDir, 'openflux'),
    `Bundle at ${bundleDir} is missing the openflux launcher.`
  );

  await ensureDir(outputDir);
  await remove(appDir);
  await ensureDir(macOsDir);
  await ensureDir(resourcesDir);
  await emptyDir(resourcesDir);

  await copy(bundleDir, embeddedBundleDir, { dereference: true });

  const infoTemplate = await fsp.readFile(INFO_TEMPLATE_PATH, 'utf8');
  const infoPlist = renderTemplate(infoTemplate, {
    APP_VERSION: packageInfo.version
  });

  await fsp.writeFile(path.join(contentsDir, 'Info.plist'), infoPlist, 'utf8');
  await fsp.writeFile(path.join(macOsDir, 'OpenFlux'), createMacExecutable(), 'utf8');
  await fsp.chmod(path.join(macOsDir, 'OpenFlux'), 0o755);
  await fsp.writeFile(path.join(embeddedBundleDir, 'start-openflux.command'), createMacCommandScript(), 'utf8');
  await fsp.chmod(path.join(embeddedBundleDir, 'start-openflux.command'), 0o755);

  await createZipArchive(appDir, zipPath);

  console.log(`macOS app bundle: ${appDir}`);
  console.log(`macOS zip archive: ${zipPath}`);

  if (shouldCreateDmg) {
    await runHdiutil(appDir, dmgPath);
    console.log(`macOS dmg: ${dmgPath}`);
  }
}

main().catch((error) => {
  console.error(`Failed to create macOS app bundle: ${error.message}`);
  process.exitCode = 1;
});
