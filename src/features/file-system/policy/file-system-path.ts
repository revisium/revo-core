import path from 'node:path';

import { FileSystemError } from '../contracts/file-system.error.js';

export function absolutePath(location: string): string {
  if (
    typeof location !== 'string' ||
    !location ||
    location.includes('\0') ||
    !path.isAbsolute(location)
  ) {
    throw new FileSystemError('FILE_SYSTEM_INVALID_PATH');
  }

  if (
    process.platform === 'win32' &&
    (location.startsWith('\\\\?\\') ||
      location.startsWith('\\\\.\\') ||
      location.slice(2).includes(':'))
  ) {
    throw new FileSystemError('FILE_SYSTEM_INVALID_PATH');
  }

  return path.resolve(location);
}

export function containsPath(root: string, location: string): boolean {
  const relative = path.relative(root, location);

  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
  );
}

export function directoryChild(parent: string, name: string): string {
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name === '.' ||
    name === '..' ||
    /[/\\<>:"|?*]/u.test(name) ||
    Array.from(name).some((character) => character.charCodeAt(0) < 32) ||
    /[. ]$/u.test(name) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(name)
  ) {
    throw new FileSystemError('FILE_SYSTEM_INVALID_NAME');
  }

  return path.join(parent, name);
}
