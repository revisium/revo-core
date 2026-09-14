import type {
  FileSystemAccessContext,
  FileSystemPage,
  FileSystemRoot,
  FileSystemPageOptions,
} from '../../contracts/file-system.contracts.js';

export type GetRootsQueryData = FileSystemPageOptions;
export type GetRootsQueryReturnType = FileSystemPage<FileSystemRoot>;

export class GetRootsQuery {
  constructor(
    readonly data: GetRootsQueryData,
    readonly context: FileSystemAccessContext | undefined,
  ) {}
}
