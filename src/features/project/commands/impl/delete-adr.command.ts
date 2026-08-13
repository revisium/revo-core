export type DeleteAdrCommandData = {
  readonly projectId: string;
  readonly id: string;
};

export type DeleteAdrCommandReturnType = boolean;

export class DeleteAdrCommand {
  constructor(readonly data: DeleteAdrCommandData) {}
}
