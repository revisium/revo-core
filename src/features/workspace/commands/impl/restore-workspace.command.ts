import type { WorkspaceRecord } from '../../contracts/workspace.contracts.js';

export type RestoreWorkspaceCommandData = {
  projectId: string;
  id: string;
};
export type RestoreWorkspaceCommandReturnType = WorkspaceRecord;

export class RestoreWorkspaceCommand {
  constructor(readonly data: RestoreWorkspaceCommandData) {}
}
