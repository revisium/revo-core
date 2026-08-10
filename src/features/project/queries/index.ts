import { GetProjectHandler } from './handlers/get-project.handler.js';

export { GetProjectQuery } from './impl/get-project.query.js';
export type { GetProjectQueryData, GetProjectQueryReturnType } from './impl/get-project.query.js';

export const PROJECT_QUERY_HANDLERS = [GetProjectHandler];
