import { GetProjectRecordHandler } from './handlers/get-project-record.handler.js';
import { GetProjectHandler } from './handlers/get-project.handler.js';
import { GetUserProjectHandler } from './handlers/get-user-project.handler.js';
import { ListProjectRecordsHandler } from './handlers/list-project-records.handler.js';
import { ListUserProjectIdsHandler } from './handlers/list-user-project-ids.handler.js';
import { ListUserProjectsHandler } from './handlers/list-user-projects.handler.js';

export { GetProjectQuery } from './impl/get-project.query.js';
export type { GetProjectQueryData, GetProjectQueryReturnType } from './impl/get-project.query.js';
export { GetProjectRecordQuery } from './impl/get-project-record.query.js';
export type {
  GetProjectRecordQueryData,
  GetProjectRecordQueryReturnType,
} from './impl/get-project-record.query.js';
export { GetUserProjectQuery } from './impl/get-user-project.query.js';
export type {
  GetUserProjectQueryData,
  GetUserProjectQueryReturnType,
} from './impl/get-user-project.query.js';
export { ListProjectRecordsQuery } from './impl/list-project-records.query.js';
export type {
  ListProjectRecordsQueryData,
  ListProjectRecordsQueryReturnType,
} from './impl/list-project-records.query.js';
export { ListUserProjectIdsQuery } from './impl/list-user-project-ids.query.js';
export type { ListUserProjectIdsQueryReturnType } from './impl/list-user-project-ids.query.js';
export { ListUserProjectsQuery } from './impl/list-user-projects.query.js';
export type {
  ListUserProjectsQueryData,
  ListUserProjectsQueryReturnType,
} from './impl/list-user-projects.query.js';

export const PROJECT_QUERY_HANDLERS = [
  GetProjectHandler,
  GetUserProjectHandler,
  ListUserProjectsHandler,
  ListUserProjectIdsHandler,
  GetProjectRecordHandler,
  ListProjectRecordsHandler,
];
