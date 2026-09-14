export type ArchiveWorkspaceCommandData = {
  projectId: string;
  id: string;
};
export type ArchiveWorkspaceCommandReturnType = boolean;

export class ArchiveWorkspaceCommand {
  constructor(readonly data: ArchiveWorkspaceCommandData) {}
}
