export type ResolveReviewThreadCommandData = {
  readonly threadId: string;
  readonly resolvedBy: string;
  readonly expectedVersion: number;
};

export type ResolveReviewThreadCommandReturnType = boolean;

export class ResolveReviewThreadCommand {
  constructor(readonly data: ResolveReviewThreadCommandData) {}
}
