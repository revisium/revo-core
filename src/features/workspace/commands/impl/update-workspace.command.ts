import type { WorkspaceActorContext } from '../../contracts/workspace.contracts.js';

export type UpdateWorkspaceCommandData = {
  projectId: string;
  id: string;
  expectedVersion: number;
  name?: string;
  description?: string;
  sourcePath?: string;
};
export type UpdateWorkspaceCommandReturnType = boolean;

export class UpdateWorkspaceCommand {
  constructor(
    readonly data: UpdateWorkspaceCommandData,
    readonly context: WorkspaceActorContext | undefined,
  ) {}
}
