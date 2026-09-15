import path from 'node:path';

import { FileSystemError } from '../contracts/file-system.error.js';

export function absolutePath(location: string): string {
  if (
    typeof location !== 'string' ||
    !location ||
    location.includes('\0') ||
    !path.isAbsolute(location)
  ) {
    throw new FileSystemError({ code: 'FILE_SYSTEM_INVALID_PATH', details: {} });
  }

  if (
    process.platform === 'win32' &&
    (location.startsWith('\\\\?\\') ||
      location.startsWith('\\\\.\\') ||
      location.slice(2).includes(':'))
  ) {
    throw new FileSystemError({ code: 'FILE_SYSTEM_INVALID_PATH', details: {} });
  }

  return path.resolve(location);
}

export function directoryChild(parent: string, name: string): string {
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name === '.' ||
    name === '..' ||
    /[/\\<>:"|?*]/u.test(name) ||
    Array.from(name).some((character) => (character.codePointAt(0) ?? 0) < 32) ||
    /[. ]$/u.test(name) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(name)
  ) {
    throw new FileSystemError({ code: 'FILE_SYSTEM_INVALID_NAME', details: {} });
  }

  return path.join(parent, name);
}
