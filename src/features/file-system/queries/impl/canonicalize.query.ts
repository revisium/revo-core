import type { FileSystemAccessContext } from '../../contracts/file-system.contracts.js';

export type CanonicalizeQueryData = { path: string };

export class CanonicalizeQuery {
  constructor(
    readonly data: CanonicalizeQueryData,
    readonly context: FileSystemAccessContext | undefined,
  ) {}
}
