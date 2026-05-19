import path from 'node:path';

export function isPathInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function resolveSafePath(baseDir, relativePath = '') {
  const safeRelativePath = path
    .normalize(relativePath)
    .replace(/^(\.\.(\/|\\|$))+/, '')
    .replace(/^[/\\]+/, '');
  const resolvedPath = path.resolve(baseDir, safeRelativePath);

  if (!isPathInside(baseDir, resolvedPath)) {
    throw new Error('Resolved path is outside the allowed directory');
  }

  return resolvedPath;
}

export function sanitizeFilename(name = '') {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255);
}

export function toPosixRelativePath(filePath) {
  return filePath.split(path.sep).join('/');
}
