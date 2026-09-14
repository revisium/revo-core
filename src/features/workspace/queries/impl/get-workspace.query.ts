import type { WorkspaceRecord } from '../../contracts/workspace.contracts.js';

export type GetWorkspaceQueryData = { projectId: string; id: string };
export type GetWorkspaceQueryReturnType = WorkspaceRecord;

export class GetWorkspaceQuery {
  constructor(readonly data: GetWorkspaceQueryData) {}
}
