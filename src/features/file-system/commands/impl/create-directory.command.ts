import type {
  FileSystemAccessContext,
  FileSystemEntry,
} from '../../contracts/file-system.contracts.js';

export type CreateDirectoryCommandData = { parentPath: string; name: string };
export type CreateDirectoryCommandReturnType = FileSystemEntry;

export class CreateDirectoryCommand {
  constructor(
    readonly data: CreateDirectoryCommandData,
    readonly context: FileSystemAccessContext | undefined,
  ) {}
}
