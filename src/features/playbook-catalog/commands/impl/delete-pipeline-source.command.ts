export type DeletePipelineSourceCommandData = {
  readonly id: string;
};

export type DeletePipelineSourceCommandReturnType = boolean;

export class DeletePipelineSourceCommand {
  constructor(readonly data: DeletePipelineSourceCommandData) {}
}
