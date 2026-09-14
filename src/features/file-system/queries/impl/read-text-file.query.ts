import type { FileSystemAccessContext } from '../../contracts/file-system.contracts.js';

export type ReadTextFileQueryData = { readonly path: string };

export class ReadTextFileQuery {
  constructor(
    readonly data: ReadTextFileQueryData,
    readonly context?: FileSystemAccessContext,
  ) {}
}
