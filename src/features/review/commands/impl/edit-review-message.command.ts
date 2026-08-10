export type EditReviewMessageCommandData = {
  readonly messageId: string;
  readonly body: string | null;
  readonly expectedVersion: number;
};

export type EditReviewMessageCommandReturnType = boolean;

export class EditReviewMessageCommand {
  constructor(readonly data: EditReviewMessageCommandData) {}
}
