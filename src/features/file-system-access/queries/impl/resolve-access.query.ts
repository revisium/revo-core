import type { FileSystemAccessContext } from '../../../file-system/contracts/file-system.contracts.js';
import type { ResolveFileSystemAccessData } from '../../contracts/file-system-policy.contracts.js';

export type ResolveAccessQueryData = ResolveFileSystemAccessData;
export type ResolveAccessQueryReturnType = FileSystemAccessContext;

export class ResolveAccessQuery {
  constructor(readonly data: ResolveAccessQueryData) {}
}
