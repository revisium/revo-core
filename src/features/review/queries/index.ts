import { GetReviewThreadHandler } from './handlers/get-review-thread.handler.js';
import { GetReviewThreadsHandler } from './handlers/get-review-threads.handler.js';

export { GetReviewThreadQuery } from './impl/get-review-thread.query.js';
export type {
  GetReviewThreadQueryData,
  GetReviewThreadQueryReturnType,
} from './impl/get-review-thread.query.js';
export { GetReviewThreadsQuery } from './impl/get-review-threads.query.js';
export type {
  GetReviewThreadsQueryData,
  GetReviewThreadsQueryReturnType,
} from './impl/get-review-threads.query.js';

export const REVIEW_QUERY_HANDLERS = [GetReviewThreadHandler, GetReviewThreadsHandler];
