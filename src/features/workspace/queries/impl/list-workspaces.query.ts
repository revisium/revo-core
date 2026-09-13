import type { WorkspacePage } from '../../contracts/workspace.contracts.js';

export type ListWorkspacesQueryData = { projectId: string; first?: number; after?: string };
export type ListWorkspacesQueryReturnType = WorkspacePage;

export class ListWorkspacesQuery {
  constructor(readonly data: ListWorkspacesQueryData) {}
}
