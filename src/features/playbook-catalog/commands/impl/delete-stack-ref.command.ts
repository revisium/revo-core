export type DeleteStackRefCommandData = {
  readonly id: string;
};

export type DeleteStackRefCommandReturnType = boolean;

export class DeleteStackRefCommand {
  constructor(readonly data: DeleteStackRefCommandData) {}
}
