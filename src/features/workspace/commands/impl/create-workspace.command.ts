import type { WorkspaceType } from '../../contracts/workspace.contracts.js';

export type CreateWorkspaceCommandData = {
  projectId: string;
  name: string;
  description?: string;
  type: WorkspaceType;
  sourcePath: string;
};
export type CreateWorkspaceCommandReturnType = { workspaceId: string };

export class CreateWorkspaceCommand {
  constructor(readonly data: CreateWorkspaceCommandData) {}
}
