import type { WorkspaceActorContext } from '../../contracts/workspace.contracts.js';

export type DisconnectWorkspaceCommandData = {
  projectId: string;
  id: string;
};
export type DisconnectWorkspaceCommandReturnType = boolean;

export class DisconnectWorkspaceCommand {
  constructor(
    readonly data: DisconnectWorkspaceCommandData,
    readonly context: WorkspaceActorContext | undefined,
  ) {}
}
