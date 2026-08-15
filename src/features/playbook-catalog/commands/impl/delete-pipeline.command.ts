export type DeletePipelineCommandData = {
  readonly id: string;
};

export type DeletePipelineCommandReturnType = boolean;

export class DeletePipelineCommand {
  constructor(readonly data: DeletePipelineCommandData) {}
}
