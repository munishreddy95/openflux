import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';

export function getDefaultStorageDir() {
  return path.join(os.homedir(), '.openflux');
}

export function getDefaultPaths(storageDir = getDefaultStorageDir()) {
  return {
    storageDir,
    downloadDir: path.join(storageDir, 'downloads'),
    uploadDir: path.join(storageDir, 'uploads'),
    logsDir: path.join(storageDir, 'logs'),
    dbPath: path.join(storageDir, 'db.json'),
    configPath: path.join(storageDir, 'config.json')
  };
}

export async function ensureStoragePaths(paths) {
  await fs.ensureDir(paths.storageDir);
  await fs.ensureDir(paths.downloadDir);
  await fs.ensureDir(paths.uploadDir);
  await fs.ensureDir(paths.logsDir);
}
