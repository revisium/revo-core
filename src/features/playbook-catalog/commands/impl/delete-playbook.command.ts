export type DeletePlaybookCommandData = {
  readonly id: string;
};

export type DeletePlaybookCommandReturnType = boolean;

export class DeletePlaybookCommand {
  constructor(readonly data: DeletePlaybookCommandData) {}
}
