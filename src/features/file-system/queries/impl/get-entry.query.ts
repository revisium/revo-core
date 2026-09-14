import type {
  FileSystemAccessContext,
  FileSystemEntry,
} from '../../contracts/file-system.contracts.js';

export type GetEntryQueryData = { path: string };
export type GetEntryQueryReturnType = FileSystemEntry;

export class GetEntryQuery {
  constructor(
    readonly data: GetEntryQueryData,
    readonly context: FileSystemAccessContext | undefined,
  ) {}
}
