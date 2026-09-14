import type { WorkspaceCheck } from '../../contracts/workspace.contracts.js';

export type CheckWorkspaceCommandData = { projectId: string; id: string };
export type CheckWorkspaceCommandReturnType = WorkspaceCheck;

export class CheckWorkspaceCommand {
  constructor(readonly data: CheckWorkspaceCommandData) {}
}
