import { AddReviewMessageHandler } from './handlers/add-review-message.handler.js';
import { CreateReviewThreadHandler } from './handlers/create-review-thread.handler.js';
import { DeleteReviewMessageHandler } from './handlers/delete-review-message.handler.js';
import { EditReviewMessageHandler } from './handlers/edit-review-message.handler.js';
import { ReopenReviewThreadHandler } from './handlers/reopen-review-thread.handler.js';
import { ResolveReviewThreadHandler } from './handlers/resolve-review-thread.handler.js';

export { AddReviewMessageCommand } from './impl/add-review-message.command.js';
export type {
  AddReviewMessageCommandData,
  AddReviewMessageCommandReturnType,
} from './impl/add-review-message.command.js';
export { CreateReviewThreadCommand } from './impl/create-review-thread.command.js';
export type {
  CreateReviewThreadCommandData,
  CreateReviewThreadCommandReturnType,
} from './impl/create-review-thread.command.js';
export { DeleteReviewMessageCommand } from './impl/delete-review-message.command.js';
export type {
  DeleteReviewMessageCommandData,
  DeleteReviewMessageCommandReturnType,
} from './impl/delete-review-message.command.js';
export { EditReviewMessageCommand } from './impl/edit-review-message.command.js';
export type {
  EditReviewMessageCommandData,
  EditReviewMessageCommandReturnType,
} from './impl/edit-review-message.command.js';
export { ReopenReviewThreadCommand } from './impl/reopen-review-thread.command.js';
export type {
  ReopenReviewThreadCommandData,
  ReopenReviewThreadCommandReturnType,
} from './impl/reopen-review-thread.command.js';
export { ResolveReviewThreadCommand } from './impl/resolve-review-thread.command.js';
export type {
  ResolveReviewThreadCommandData,
  ResolveReviewThreadCommandReturnType,
} from './impl/resolve-review-thread.command.js';

export const REVIEW_COMMAND_HANDLERS = [
  CreateReviewThreadHandler,
  AddReviewMessageHandler,
  EditReviewMessageHandler,
  DeleteReviewMessageHandler,
  ResolveReviewThreadHandler,
  ReopenReviewThreadHandler,
];
