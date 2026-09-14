export type UpdateWorkspaceCommandData = {
  projectId: string;
  id: string;
  name?: string;
  description?: string;
  sourcePath?: string;
};
export type UpdateWorkspaceCommandReturnType = WorkspaceRecord;

export class UpdateWorkspaceCommand {
  constructor(readonly data: UpdateWorkspaceCommandData) {}
}
import type { WorkspaceRecord } from '../../contracts/workspace.contracts.js';
