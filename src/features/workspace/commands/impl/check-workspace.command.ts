import type { WorkspaceActorContext } from '../../contracts/workspace.contracts.js';

export type CheckWorkspaceCommandData = { projectId: string; id: string; expectedVersion: number };
export type CheckWorkspaceCommandReturnType = boolean;

export class CheckWorkspaceCommand {
  constructor(
    readonly data: CheckWorkspaceCommandData,
    readonly context: WorkspaceActorContext | undefined,
  ) {}
}
