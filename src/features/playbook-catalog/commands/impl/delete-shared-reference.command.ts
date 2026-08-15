export type DeleteSharedReferenceCommandData = {
  readonly id: string;
};

export type DeleteSharedReferenceCommandReturnType = boolean;

export class DeleteSharedReferenceCommand {
  constructor(readonly data: DeleteSharedReferenceCommandData) {}
}
