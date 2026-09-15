import { ApplicationError } from '../../../application/errors/application-error.js';

export const FileSystemErrorCode = {
  notFound: 'FILE_SYSTEM_NOT_FOUND',
  notDirectory: 'FILE_SYSTEM_NOT_DIRECTORY',
  accessDenied: 'FILE_SYSTEM_ACCESS_DENIED',
  alreadyExists: 'FILE_SYSTEM_ALREADY_EXISTS',
  invalidPath: 'FILE_SYSTEM_INVALID_PATH',
  invalidName: 'FILE_SYSTEM_INVALID_NAME',
  tooLarge: 'FILE_SYSTEM_TOO_LARGE',
  ioError: 'FILE_SYSTEM_IO_ERROR',
} as const;

export type FileSystemErrorCode = (typeof FileSystemErrorCode)[keyof typeof FileSystemErrorCode];

export type FileSystemErrorDetails = {
  [TCode in FileSystemErrorCode]: Record<string, never>;
};

export class FileSystemError<
  TCode extends FileSystemErrorCode = FileSystemErrorCode,
> extends ApplicationError<TCode, FileSystemErrorDetails[TCode]> {
  constructor(readonly code: TCode) {
    super(code, {});
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
