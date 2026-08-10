import type { Prisma } from '../../../../__generated__/client/client.js';

export type GetReviewThreadQueryData = {
  readonly threadId: string;
};

export type GetReviewThreadQueryReturnType = Prisma.ReviewThreadGetPayload<{
  include: { messages: true };
}>;

export class GetReviewThreadQuery {
  constructor(readonly data: GetReviewThreadQueryData) {}
}
