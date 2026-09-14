export type ArchiveWorkspaceCommandData = {
  projectId: string;
  id: string;
};
export type ArchiveWorkspaceCommandReturnType = WorkspaceRecord;

export class ArchiveWorkspaceCommand {
  constructor(readonly data: ArchiveWorkspaceCommandData) {}
}
import type { WorkspaceRecord } from '../../contracts/workspace.contracts.js';
