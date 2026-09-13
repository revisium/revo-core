import type {
  FileSystemPermissionSet,
  FileSystemAccessContext,
} from '../../file-system/contracts/file-system.contracts.js';

export type FileSystemPolicyRecord = {
  id: string;
  name: string;
  document: FileSystemPermissionSet;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
};

export type ResolveFileSystemAccessData = {
  readonly authority: FileSystemAccessContext;
  readonly rootPaths: readonly string[];
  readonly boundaryPolicyId: string;
  readonly grantPolicyId: string;
  readonly restrictionPolicyIds?: readonly string[];
};
