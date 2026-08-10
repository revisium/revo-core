export type AddReviewMessageCommandData = {
  readonly messageId: string;
  readonly threadId: string;
  readonly authorId: string;
  readonly body: string | null;
};

export type AddReviewMessageCommandReturnType = boolean;

export class AddReviewMessageCommand {
  constructor(readonly data: AddReviewMessageCommandData) {}
}
