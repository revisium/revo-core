import type { ReviewThread } from '../../../../__generated__/client/client.js';

export type GetReviewThreadsQueryData = {
  readonly scopeKey: string;
  readonly subjectKey?: string;
  readonly contextKey?: string | null;
  readonly resolved?: boolean;
};

export type GetReviewThreadsQueryReturnType = ReviewThread[];

export class GetReviewThreadsQuery {
  constructor(readonly data: GetReviewThreadsQueryData) {}
}
