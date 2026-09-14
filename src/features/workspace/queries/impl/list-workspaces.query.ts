import type { WorkspacePage } from '../../contracts/workspace.contracts.js';

export type ListWorkspacesQueryData = {
  projectId: string;
  first?: number;
  after?: string;
  includeArchived?: boolean;
};
export type ListWorkspacesQueryReturnType = WorkspacePage;

export class ListWorkspacesQuery {
  constructor(readonly data: ListWorkspacesQueryData) {}
}
