import type { WorkspaceRecord, WorkspaceType } from '../../contracts/workspace.contracts.js';

export type CreateWorkspaceCommandData = {
  projectId: string;
  name: string;
  description?: string;
  type: WorkspaceType;
  sourcePath: string;
};
export type CreateWorkspaceCommandReturnType = WorkspaceRecord;

export class CreateWorkspaceCommand {
  constructor(readonly data: CreateWorkspaceCommandData) {}
}
