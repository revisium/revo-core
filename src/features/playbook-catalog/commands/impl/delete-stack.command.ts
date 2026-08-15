export type DeleteStackCommandData = {
  readonly id: string;
};

export type DeleteStackCommandReturnType = boolean;

export class DeleteStackCommand {
  constructor(readonly data: DeleteStackCommandData) {}
}
