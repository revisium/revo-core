import { PublicHttpException } from '../../../infrastructure/errors/public-http-exception.js';
import { FileSystemErrorText } from './errors.en.js';

const statuses = {
  FILE_SYSTEM_NOT_FOUND: 404,
  FILE_SYSTEM_NOT_DIRECTORY: 400,
  FILE_SYSTEM_ACCESS_DENIED: 403,
  FILE_SYSTEM_ALREADY_EXISTS: 409,
  FILE_SYSTEM_INVALID_PATH: 400,
  FILE_SYSTEM_INVALID_NAME: 400,
  FILE_SYSTEM_TOO_LARGE: 413,
  FILE_SYSTEM_IO_ERROR: 500,
} as const;

export type FileSystemErrorCode = keyof typeof statuses;

export class FileSystemError extends PublicHttpException {
  constructor(readonly code: FileSystemErrorCode) {
    const statusCode = statuses[code];
    const message = FileSystemErrorText[code];
    super({ statusCode, code, message }, 'minimal');
  }
}

export function rethrowFileSystemError(error: unknown): never {
  if (error instanceof FileSystemError) {
    throw error;
  }

  const code =
    typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

  switch (code) {
    case 'ENOENT':
      throw new FileSystemError('FILE_SYSTEM_NOT_FOUND');
    case 'ENOTDIR':
      throw new FileSystemError('FILE_SYSTEM_NOT_DIRECTORY');
    case 'EACCES':
    case 'EPERM':
      throw new FileSystemError('FILE_SYSTEM_ACCESS_DENIED');
    case 'EEXIST':
      throw new FileSystemError('FILE_SYSTEM_ALREADY_EXISTS');
    case 'EINVAL':
    case 'ENAMETOOLONG':
    case 'ELOOP':
      throw new FileSystemError('FILE_SYSTEM_INVALID_PATH');
    default:
      throw new FileSystemError('FILE_SYSTEM_IO_ERROR');
  }
}
