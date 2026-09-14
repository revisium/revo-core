import { HttpException } from '@nestjs/common';

const errors = {
  FILE_SYSTEM_NOT_FOUND: [404, 'Filesystem entry was not found.'],
  FILE_SYSTEM_NOT_DIRECTORY: [400, 'Filesystem entry is not a directory.'],
  FILE_SYSTEM_ACCESS_DENIED: [403, 'The operating system denied filesystem access.'],
  FILE_SYSTEM_ALREADY_EXISTS: [409, 'Filesystem entry already exists.'],
  FILE_SYSTEM_INVALID_PATH: [400, 'Filesystem path is invalid.'],
  FILE_SYSTEM_INVALID_NAME: [400, 'Directory name is invalid.'],
  FILE_SYSTEM_TOO_LARGE: [413, 'Filesystem text exceeds the supported size.'],
  FILE_SYSTEM_IO_ERROR: [500, 'Filesystem operation failed.'],
} as const;

export type FileSystemErrorCode = keyof typeof errors;

export class FileSystemError extends HttpException {
  constructor(readonly code: FileSystemErrorCode) {
    const [statusCode, message] = errors[code];
    super({ statusCode, code, message }, statusCode);
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
