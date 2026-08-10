export type ReopenReviewThreadCommandData = {
  readonly threadId: string;
  readonly expectedVersion: number;
};

export type ReopenReviewThreadCommandReturnType = boolean;

export class ReopenReviewThreadCommand {
  constructor(readonly data: ReopenReviewThreadCommandData) {}
}
