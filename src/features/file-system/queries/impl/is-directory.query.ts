import type { FileSystemAccessContext } from '../../contracts/file-system.contracts.js';

export type IsDirectoryQueryData = { path: string };
export type IsDirectoryQueryReturnType = boolean;

export class IsDirectoryQuery {
  constructor(
    readonly data: IsDirectoryQueryData,
    readonly context: FileSystemAccessContext | undefined,
  ) {}
}
