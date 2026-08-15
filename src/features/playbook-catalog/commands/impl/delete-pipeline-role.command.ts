export type DeletePipelineRoleCommandData = {
  readonly id: string;
};

export type DeletePipelineRoleCommandReturnType = boolean;

export class DeletePipelineRoleCommand {
  constructor(readonly data: DeletePipelineRoleCommandData) {}
}
