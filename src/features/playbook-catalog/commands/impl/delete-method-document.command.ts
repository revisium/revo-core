export type DeleteMethodDocumentCommandData = {
  readonly id: string;
};

export type DeleteMethodDocumentCommandReturnType = boolean;

export class DeleteMethodDocumentCommand {
  constructor(readonly data: DeleteMethodDocumentCommandData) {}
}
