export type UpdateWorkspaceCommandData = {
  projectId: string;
  id: string;
  name?: string;
  description?: string;
  sourcePath?: string;
};
export type UpdateWorkspaceCommandReturnType = boolean;

export class UpdateWorkspaceCommand {
  constructor(readonly data: UpdateWorkspaceCommandData) {}
}
