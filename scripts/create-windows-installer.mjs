import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import fsExtra from 'fs-extra';

const { ensureDir, pathExists } = fsExtra;

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'packaging', 'windows', 'openflux-installer.nsi.tpl');

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

function toNsisPath(targetPath) {
  return path.resolve(targetPath).replace(/\//g, '\\');
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

async function runMakensis(scriptPath) {
  await new Promise((resolve, reject) => {
    const child = spawn('makensis', [scriptPath], {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    });

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('makensis was not found in PATH. Install NSIS on Windows and try again.'));
        return;
      }

      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`makensis exited with code ${code}`));
    });
  });
}

async function main() {
  const packageInfo = await readPackageInfo();
  const skipCompile = hasFlag('--skip-compile');
  const arch = getArgumentValue('--arch') ?? process.arch;
  const outputDir = path.resolve(getArgumentValue('--output-dir') ?? DIST_DIR);
  const bundleDir = path.resolve(
    getArgumentValue('--bundle-dir') ?? path.join(outputDir, `openflux-${packageInfo.version}-win32-${arch}`)
  );
  const scriptPath = path.join(outputDir, `openflux-${packageInfo.version}-win32-${arch}-installer.nsi`);
  const installerPath = path.join(outputDir, `openflux-${packageInfo.version}-win32-${arch}-setup.exe`);

  await assertPathExists(
    TEMPLATE_PATH,
    'Windows installer template is missing.'
  );
  await assertPathExists(
    bundleDir,
    `Windows bundle was not found at ${bundleDir}. Run "npm run bundle:current" on Windows first or pass --bundle-dir.`
  );
  await assertPathExists(
    path.join(bundleDir, 'openflux.cmd'),
    `Bundle at ${bundleDir} is missing openflux.cmd.`
  );
  await assertPathExists(
    path.join(bundleDir, 'start-openflux.cmd'),
    `Bundle at ${bundleDir} is missing start-openflux.cmd. Rebuild the bundle with the current packaging script.`
  );

  await ensureDir(outputDir);

  const template = await fsp.readFile(TEMPLATE_PATH, 'utf8');
  const rendered = renderTemplate(template, {
    APP_VERSION: packageInfo.version,
    BUNDLE_DIR: toNsisPath(bundleDir),
    OUTPUT_EXE: toNsisPath(installerPath)
  });

  await fsp.writeFile(scriptPath, rendered, 'utf8');

  if (skipCompile) {
    console.log(`Installer script: ${scriptPath}`);
    console.log(`Expected setup exe: ${installerPath}`);
    return;
  }

  await runMakensis(scriptPath);
  console.log(`Installer script: ${scriptPath}`);
  console.log(`Setup exe: ${installerPath}`);
}

main().catch((error) => {
  console.error(`Failed to create Windows installer: ${error.message}`);
  process.exitCode = 1;
});
