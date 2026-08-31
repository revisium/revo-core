import { GetAdrHandler } from './handlers/get-adr.handler.js';
import { GetProjectHandler } from './handlers/get-project.handler.js';
import { GetRequirementHandler } from './handlers/get-requirement.handler.js';
import { GetUserProjectHandler } from './handlers/get-user-project.handler.js';
import { GetWorkItemHandler } from './handlers/get-work-item.handler.js';
import { GetWorkPlanHandler } from './handlers/get-work-plan.handler.js';
import { ListAdrsHandler } from './handlers/list-adrs.handler.js';
import { ListRequirementsHandler } from './handlers/list-requirements.handler.js';
import { ListUnfinishedUserProjectIdsHandler } from './handlers/list-unfinished-user-project-ids.handler.js';
import { ListUserProjectIdsHandler } from './handlers/list-user-project-ids.handler.js';
import { ListUserProjectsHandler } from './handlers/list-user-projects.handler.js';
import { ListWorkItemsHandler } from './handlers/list-work-items.handler.js';
import { ListWorkPlansHandler } from './handlers/list-work-plans.handler.js';

export { GetAdrQuery } from './impl/get-adr.query.js';
export type { GetAdrQueryData, GetAdrQueryReturnType } from './impl/get-adr.query.js';
export { GetProjectQuery } from './impl/get-project.query.js';
export type { GetProjectQueryData, GetProjectQueryReturnType } from './impl/get-project.query.js';
export { GetRequirementQuery } from './impl/get-requirement.query.js';
export type {
  GetRequirementQueryData,
  GetRequirementQueryReturnType,
} from './impl/get-requirement.query.js';
export { GetUserProjectQuery } from './impl/get-user-project.query.js';
export type {
  GetUserProjectQueryData,
  GetUserProjectQueryReturnType,
} from './impl/get-user-project.query.js';
export { GetWorkItemQuery } from './impl/get-work-item.query.js';
export type {
  GetWorkItemQueryData,
  GetWorkItemQueryReturnType,
} from './impl/get-work-item.query.js';
export { GetWorkPlanQuery } from './impl/get-work-plan.query.js';
export type {
  GetWorkPlanQueryData,
  GetWorkPlanQueryReturnType,
} from './impl/get-work-plan.query.js';
export { ListAdrsQuery } from './impl/list-adrs.query.js';
export type { ListAdrsQueryData, ListAdrsQueryReturnType } from './impl/list-adrs.query.js';
export { ListRequirementsQuery } from './impl/list-requirements.query.js';
export type {
  ListRequirementsQueryData,
  ListRequirementsQueryReturnType,
} from './impl/list-requirements.query.js';
export { ListUnfinishedUserProjectIdsQuery } from './impl/list-unfinished-user-project-ids.query.js';
export type {
  ListUnfinishedUserProjectIdsQueryData,
  ListUnfinishedUserProjectIdsQueryReturnType,
} from './impl/list-unfinished-user-project-ids.query.js';
export { ListUserProjectIdsQuery } from './impl/list-user-project-ids.query.js';
export type {
  ListUserProjectIdsQueryData,
  ListUserProjectIdsQueryReturnType,
} from './impl/list-user-project-ids.query.js';
export { ListUserProjectsQuery } from './impl/list-user-projects.query.js';
export type {
  ListUserProjectsQueryData,
  ListUserProjectsQueryReturnType,
} from './impl/list-user-projects.query.js';
export { ListWorkItemsQuery } from './impl/list-work-items.query.js';
export type {
  ListWorkItemsQueryData,
  ListWorkItemsQueryReturnType,
} from './impl/list-work-items.query.js';
export { ListWorkPlansQuery } from './impl/list-work-plans.query.js';
export type {
  ListWorkPlansQueryData,
  ListWorkPlansQueryReturnType,
} from './impl/list-work-plans.query.js';

export const PROJECT_QUERY_HANDLERS = [
  GetProjectHandler,
  GetUserProjectHandler,
  ListUserProjectsHandler,
  ListUnfinishedUserProjectIdsHandler,
  ListUserProjectIdsHandler,
  GetAdrHandler,
  ListAdrsHandler,
  GetRequirementHandler,
  ListRequirementsHandler,
  GetWorkPlanHandler,
  ListWorkPlansHandler,
  GetWorkItemHandler,
  ListWorkItemsHandler,
];
