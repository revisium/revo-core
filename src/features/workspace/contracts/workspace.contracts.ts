export { WorkspaceType, WorkspaceAvailability } from '../../../__generated__/client/enums.js';
import type { WorkspaceType, WorkspaceAvailability } from '../../../__generated__/client/enums.js';

export type WorkspaceRecord = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  type: WorkspaceType;
  sourcePath: string;
  availability: WorkspaceAvailability;
  lastCheckedAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
  disconnectedAt: string | null;
};

export type WorkspaceActorContext = {
  readonly actorId: string;
};

export type WorkspaceCheck = {
  availability: WorkspaceAvailability;
  lastCheckedAt: Date;
  lastErrorCode: string | null;
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
