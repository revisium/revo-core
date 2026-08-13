export type DeleteWorkItemCommandData = {
  readonly projectId: string;
  readonly id: string;
};

export type DeleteWorkItemCommandReturnType = boolean;

export class DeleteWorkItemCommand {
  constructor(readonly data: DeleteWorkItemCommandData) {}
}
