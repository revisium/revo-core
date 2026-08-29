import { GetCatalogSnapshotHandler } from './handlers/get-catalog-snapshot.handler.js';
import { GetCatalogStatusHandler } from './handlers/get-catalog-status.handler.js';
import { GetLaunchProfileHandler } from './handlers/get-launch-profile.handler.js';
import { GetMethodDocumentHandler } from './handlers/get-method-document.handler.js';
import { GetPipelineRoleHandler } from './handlers/get-pipeline-role.handler.js';
import { GetPipelineHandler } from './handlers/get-pipeline.handler.js';
import { GetPlaybookHandler } from './handlers/get-playbook.handler.js';
import { GetRoleRefHandler } from './handlers/get-role-ref.handler.js';
import { GetRoleHandler } from './handlers/get-role.handler.js';
import { GetSharedReferenceHandler } from './handlers/get-shared-reference.handler.js';
import { GetStackRefHandler } from './handlers/get-stack-ref.handler.js';
import { GetStackHandler } from './handlers/get-stack.handler.js';
import { ListCatalogChangesHandler } from './handlers/list-catalog-changes.handler.js';
import { ListLaunchProfilesHandler } from './handlers/list-launch-profiles.handler.js';
import { ListMethodDocumentsHandler } from './handlers/list-method-documents.handler.js';
import { ListPipelineRolesHandler } from './handlers/list-pipeline-roles.handler.js';
import { ListPipelinesHandler } from './handlers/list-pipelines.handler.js';
import { ListPlaybooksHandler } from './handlers/list-playbooks.handler.js';
import { ListRoleRefsHandler } from './handlers/list-role-refs.handler.js';
import { ListRolesHandler } from './handlers/list-roles.handler.js';
import { ListSharedReferencesHandler } from './handlers/list-shared-references.handler.js';
import { ListStackRefsHandler } from './handlers/list-stack-refs.handler.js';
import { ListStacksHandler } from './handlers/list-stacks.handler.js';

export { GetPlaybookQuery } from './impl/get-playbook.query.js';
export type {
  GetPlaybookQueryData,
  GetPlaybookQueryReturnType,
} from './impl/get-playbook.query.js';
export { ListPlaybooksQuery } from './impl/list-playbooks.query.js';
export type {
  ListPlaybooksQueryData,
  ListPlaybooksQueryReturnType,
} from './impl/list-playbooks.query.js';
export { GetRoleQuery } from './impl/get-role.query.js';
export type { GetRoleQueryData, GetRoleQueryReturnType } from './impl/get-role.query.js';
export { ListRolesQuery } from './impl/list-roles.query.js';
export type { ListRolesQueryData, ListRolesQueryReturnType } from './impl/list-roles.query.js';
export { GetRoleRefQuery } from './impl/get-role-ref.query.js';
export type { GetRoleRefQueryData, GetRoleRefQueryReturnType } from './impl/get-role-ref.query.js';
export { ListRoleRefsQuery } from './impl/list-role-refs.query.js';
export type {
  ListRoleRefsQueryData,
  ListRoleRefsQueryReturnType,
} from './impl/list-role-refs.query.js';
export { GetSharedReferenceQuery } from './impl/get-shared-reference.query.js';
export type {
  GetSharedReferenceQueryData,
  GetSharedReferenceQueryReturnType,
} from './impl/get-shared-reference.query.js';
export { ListSharedReferencesQuery } from './impl/list-shared-references.query.js';
export type {
  ListSharedReferencesQueryData,
  ListSharedReferencesQueryReturnType,
} from './impl/list-shared-references.query.js';
export { GetStackQuery } from './impl/get-stack.query.js';
export type { GetStackQueryData, GetStackQueryReturnType } from './impl/get-stack.query.js';
export { ListStacksQuery } from './impl/list-stacks.query.js';
export type { ListStacksQueryData, ListStacksQueryReturnType } from './impl/list-stacks.query.js';
export { GetStackRefQuery } from './impl/get-stack-ref.query.js';
export type {
  GetStackRefQueryData,
  GetStackRefQueryReturnType,
} from './impl/get-stack-ref.query.js';
export { ListStackRefsQuery } from './impl/list-stack-refs.query.js';
export type {
  ListStackRefsQueryData,
  ListStackRefsQueryReturnType,
} from './impl/list-stack-refs.query.js';
export { GetMethodDocumentQuery } from './impl/get-method-document.query.js';
export type {
  GetMethodDocumentQueryData,
  GetMethodDocumentQueryReturnType,
} from './impl/get-method-document.query.js';
export { ListMethodDocumentsQuery } from './impl/list-method-documents.query.js';
export type {
  ListMethodDocumentsQueryData,
  ListMethodDocumentsQueryReturnType,
} from './impl/list-method-documents.query.js';
export { GetPipelineQuery } from './impl/get-pipeline.query.js';
export type {
  GetPipelineQueryData,
  GetPipelineQueryReturnType,
} from './impl/get-pipeline.query.js';
export { ListPipelinesQuery } from './impl/list-pipelines.query.js';
export type {
  ListPipelinesQueryData,
  ListPipelinesQueryReturnType,
} from './impl/list-pipelines.query.js';
export { GetPipelineRoleQuery } from './impl/get-pipeline-role.query.js';
export type {
  GetPipelineRoleQueryData,
  GetPipelineRoleQueryReturnType,
} from './impl/get-pipeline-role.query.js';
export { ListPipelineRolesQuery } from './impl/list-pipeline-roles.query.js';
export type {
  ListPipelineRolesQueryData,
  ListPipelineRolesQueryReturnType,
} from './impl/list-pipeline-roles.query.js';
export { GetLaunchProfileQuery } from './impl/get-launch-profile.query.js';
export type {
  GetLaunchProfileQueryData,
  GetLaunchProfileQueryReturnType,
} from './impl/get-launch-profile.query.js';
export { ListLaunchProfilesQuery } from './impl/list-launch-profiles.query.js';
export type {
  ListLaunchProfilesQueryData,
  ListLaunchProfilesQueryReturnType,
} from './impl/list-launch-profiles.query.js';
export { GetCatalogSnapshotQuery } from './impl/get-catalog-snapshot.query.js';
export type {
  GetCatalogSnapshotQueryData,
  GetCatalogSnapshotQueryReturnType,
} from './impl/get-catalog-snapshot.query.js';
export { GetCatalogStatusQuery } from './impl/get-catalog-status.query.js';
export type { GetCatalogStatusQueryReturnType } from './impl/get-catalog-status.query.js';
export { ListCatalogChangesQuery } from './impl/list-catalog-changes.query.js';
export type {
  ListCatalogChangesQueryData,
  ListCatalogChangesQueryReturnType,
} from './impl/list-catalog-changes.query.js';

export const PLAYBOOK_CATALOG_QUERY_HANDLERS = [
  GetPlaybookHandler,
  ListPlaybooksHandler,
  GetRoleHandler,
  ListRolesHandler,
  GetRoleRefHandler,
  ListRoleRefsHandler,
  GetSharedReferenceHandler,
  ListSharedReferencesHandler,
  GetStackHandler,
  ListStacksHandler,
  GetStackRefHandler,
  ListStackRefsHandler,
  GetMethodDocumentHandler,
  ListMethodDocumentsHandler,
  GetPipelineHandler,
  ListPipelinesHandler,
  GetPipelineRoleHandler,
  ListPipelineRolesHandler,
  GetLaunchProfileHandler,
  ListLaunchProfilesHandler,
  GetCatalogStatusHandler,
  ListCatalogChangesHandler,
  GetCatalogSnapshotHandler,
];
