import { GetRunDetailsHandler } from './handlers/get-run-details.handler.js';
import { GetRunEventsHandler } from './handlers/get-run-events.handler.js';
import { GetRunHandler } from './handlers/get-run.handler.js';
import { ListRunsHandler } from './handlers/list-runs.handler.js';

export { GetRunQuery } from './impl/get-run.query.js';
export type {
  GetRunQueryData,
  GetRunQueryReturnType,
  RunSnapshotWithProject,
} from './impl/get-run.query.js';
export { GetRunDetailsQuery } from './impl/get-run-details.query.js';
export type {
  GetRunDetailsQueryData,
  GetRunDetailsQueryReturnType,
  RunDetailsWithProject,
} from './impl/get-run-details.query.js';
export { GetRunEventsQuery } from './impl/get-run-events.query.js';
export type {
  GetRunEventsQueryData,
  GetRunEventsQueryReturnType,
} from './impl/get-run-events.query.js';
export { ListRunsQuery } from './impl/list-runs.query.js';
export type {
  ListRunsQueryData,
  ListRunsQueryReturnType,
  RunListItem,
} from './impl/list-runs.query.js';

export const RUN_QUERY_HANDLERS = [
  GetRunHandler,
  GetRunDetailsHandler,
  GetRunEventsHandler,
  ListRunsHandler,
];
