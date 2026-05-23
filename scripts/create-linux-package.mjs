import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { TarArchive } = require('archiver');
const fsExtra = require('fs-extra');

const { ensureDir, pathExists } = fsExtra;

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'packaging', 'linux', 'openflux.service.tpl');

function getArgumentValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return null;
  }

  return process.argv[index + 1];
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

async function createTarGzArchive(bundleDir, archivePath) {
  await ensureDir(path.dirname(archivePath));

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(archivePath);
    const archive = new TarArchive({
      gzip: true,
      gzipOptions: { level: 9 }
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
  const arch = getArgumentValue('--arch') ?? process.arch;
  const outputDir = path.resolve(getArgumentValue('--output-dir') ?? DIST_DIR);
  const releaseName = `openflux-${packageInfo.version}-linux-${arch}`;
  const bundleDir = path.resolve(
    getArgumentValue('--bundle-dir') ?? path.join(outputDir, releaseName)
  );
  const archivePath = path.join(outputDir, `${releaseName}.tar.gz`);
  const servicePath = path.join(outputDir, `${releaseName}.service`);
  const installRoot = getArgumentValue('--install-root') ?? '/opt/openflux';
  const installDir = path.posix.join(installRoot, releaseName);

  await assertPathExists(
    TEMPLATE_PATH,
    'Linux systemd service template is missing.'
  );
  await assertPathExists(
    bundleDir,
    `Linux bundle was not found at ${bundleDir}. Run "npm run bundle:current" on Linux first or pass --bundle-dir.`
  );
  await assertPathExists(
    path.join(bundleDir, 'openflux'),
    `Bundle at ${bundleDir} is missing the openflux launcher.`
  );

  await ensureDir(outputDir);
  await createTarGzArchive(bundleDir, archivePath);

  const template = await fsp.readFile(TEMPLATE_PATH, 'utf8');
  const rendered = renderTemplate(template, {
    INSTALL_DIR: installDir
  });

  await fsp.writeFile(servicePath, rendered, 'utf8');

  console.log(`Linux archive: ${archivePath}`);
  console.log(`systemd unit: ${servicePath}`);
  console.log(`Expected install dir: ${installDir}`);
}

main().catch((error) => {
  console.error(`Failed to create Linux package: ${error.message}`);
  process.exitCode = 1;
});
