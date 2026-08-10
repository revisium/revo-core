import type { Prisma } from '../../../../__generated__/client/client.js';

export type CreateReviewThreadCommandData = {
  readonly threadId: string;
  readonly initialMessageId: string;
  readonly scopeKey: string;
  readonly subjectKey: string;
  readonly contextKey: string | null;
  readonly context: Prisma.InputJsonValue;
  readonly authorId: string;
  readonly body: string | null;
};

export type CreateReviewThreadCommandReturnType = boolean;

export class CreateReviewThreadCommand {
  constructor(readonly data: CreateReviewThreadCommandData) {}
}
