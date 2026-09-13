import type { FileSystemAccessContext } from '../../contracts/file-system.contracts.js';

export type ExistsQueryData = { path: string };
export type ExistsQueryReturnType = boolean;

export class ExistsQuery {
  constructor(
    readonly data: ExistsQueryData,
    readonly context: FileSystemAccessContext | undefined,
  ) {}
}
