import type { WorkspaceCheck, WorkspaceType } from '../../contracts/workspace.contracts.js';

export type CheckWorkspaceSourceQueryData = {
  type: WorkspaceType;
  sourcePath: string;
};
export type CheckWorkspaceSourceQueryReturnType = WorkspaceCheck;

export class CheckWorkspaceSourceQuery {
  constructor(readonly data: CheckWorkspaceSourceQueryData) {}
}
