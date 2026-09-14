import type { FileSystemAccessPolicy } from './file-system.contracts.js';

export type FileSystemAccessContext = {
  readonly policies: readonly FileSystemAccessPolicy[];
  restrict(boundary: FileSystemAccessPolicy): FileSystemAccessContext;
};
