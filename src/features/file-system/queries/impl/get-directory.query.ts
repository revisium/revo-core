import type {
  FileSystemAccessContext,
  FileSystemDirectoryOptions,
  FileSystemDirectory,
} from '../../contracts/file-system.contracts.js';

export type GetDirectoryQueryData = { path: string } & FileSystemDirectoryOptions;
export type GetDirectoryQueryReturnType = FileSystemDirectory;

export class GetDirectoryQuery {
  constructor(
    readonly data: GetDirectoryQueryData,
    readonly context: FileSystemAccessContext | undefined,
  ) {}
}
