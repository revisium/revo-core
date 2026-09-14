export { WorkspaceType } from '../../../__generated__/client/enums.js';
import type { WorkspaceType } from '../../../__generated__/client/enums.js';

export enum WorkspaceAvailability {
  AVAILABLE = 'AVAILABLE',
  NOT_FOUND = 'NOT_FOUND',
  NOT_DIRECTORY = 'NOT_DIRECTORY',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INVALID_REPOSITORY = 'INVALID_REPOSITORY',
  CHECK_FAILED = 'CHECK_FAILED',
}

export type WorkspaceRecord = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  type: WorkspaceType;
  sourcePath: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  archivedAt: string | null;
};

export type WorkspaceCheck = {
  availability: WorkspaceAvailability;
  errorCode: string | null;
};

export type WorkspacePage = {
  edges: { cursor: string; node: WorkspaceRecord }[];
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
};

export type ProjectWorkspaceSummary = {
  workspaces: { name: string; type: WorkspaceType }[];
  workspaceCount: number;
};
