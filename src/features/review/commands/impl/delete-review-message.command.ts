export type DeleteReviewMessageCommandData = {
  readonly messageId: string;
  readonly deletedBy: string;
  readonly expectedVersion: number;
};

export type DeleteReviewMessageCommandReturnType = boolean;

export class DeleteReviewMessageCommand {
  constructor(readonly data: DeleteReviewMessageCommandData) {}
}
