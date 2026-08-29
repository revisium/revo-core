export const CATALOG_PROJECT_ID = 'system_playbooks';
export const CATALOG_BRANCH_NAME = 'master';

export enum CatalogTable {
  playbooks = 'playbooks',
  roles = 'roles',
  sharedReferences = 'shared_references',
  stacks = 'stacks',
  methodDocuments = 'method_documents',
  pipelines = 'pipelines',
  roleRefs = 'role_refs',
  stackRefs = 'stack_refs',
  pipelineRoles = 'pipeline_roles',
  launchProfiles = 'launch_profiles',
}

export const CATALOG_TABLES = [
  CatalogTable.playbooks,
  CatalogTable.roles,
  CatalogTable.sharedReferences,
  CatalogTable.stacks,
  CatalogTable.methodDocuments,
  CatalogTable.pipelines,
  CatalogTable.roleRefs,
  CatalogTable.stackRefs,
  CatalogTable.pipelineRoles,
  CatalogTable.launchProfiles,
] as const;

export const CATALOG_REPLAY_CREATE_ORDER = CATALOG_TABLES;
export const CATALOG_REPLAY_REMOVE_ORDER = [...CATALOG_TABLES].reverse();

export const CATALOG_WRITABLE_CREATE_TABLES = [
  CatalogTable.playbooks,
  CatalogTable.roles,
  CatalogTable.sharedReferences,
  CatalogTable.stacks,
  CatalogTable.methodDocuments,
  CatalogTable.pipelines,
  CatalogTable.roleRefs,
  CatalogTable.stackRefs,
  CatalogTable.pipelineRoles,
  CatalogTable.launchProfiles,
] as const;

export const CATALOG_WRITABLE_UPDATE_TABLES = [
  CatalogTable.playbooks,
  CatalogTable.roles,
  CatalogTable.sharedReferences,
  CatalogTable.stacks,
  CatalogTable.methodDocuments,
  CatalogTable.pipelines,
  CatalogTable.roleRefs,
  CatalogTable.stackRefs,
  CatalogTable.launchProfiles,
] as const;

export const CATALOG_WRITABLE_DELETE_TABLES = [
  CatalogTable.playbooks,
  CatalogTable.roles,
  CatalogTable.sharedReferences,
  CatalogTable.stacks,
  CatalogTable.methodDocuments,
  CatalogTable.pipelines,
  CatalogTable.roleRefs,
  CatalogTable.stackRefs,
  CatalogTable.pipelineRoles,
  CatalogTable.launchProfiles,
] as const;

export const CATALOG_PARENT_FIELD: Partial<Record<CatalogTable, string>> = {
  [CatalogTable.roles]: 'playbookId',
  [CatalogTable.sharedReferences]: 'playbookId',
  [CatalogTable.stacks]: 'playbookId',
  [CatalogTable.methodDocuments]: 'playbookId',
  [CatalogTable.pipelines]: 'playbookId',
  [CatalogTable.roleRefs]: 'roleId',
  [CatalogTable.stackRefs]: 'stackId',
  [CatalogTable.pipelineRoles]: 'pipelineId',
  [CatalogTable.launchProfiles]: 'pipelineId',
};

export const CATALOG_CHILD_RELATIONS: ReadonlyArray<{
  readonly tableId: CatalogTable;
  readonly field: string;
  readonly parentTableId: CatalogTable;
}> = [
  { tableId: CatalogTable.roles, field: 'playbookId', parentTableId: CatalogTable.playbooks },
  {
    tableId: CatalogTable.sharedReferences,
    field: 'playbookId',
    parentTableId: CatalogTable.playbooks,
  },
  { tableId: CatalogTable.stacks, field: 'playbookId', parentTableId: CatalogTable.playbooks },
  {
    tableId: CatalogTable.methodDocuments,
    field: 'playbookId',
    parentTableId: CatalogTable.playbooks,
  },
  { tableId: CatalogTable.pipelines, field: 'playbookId', parentTableId: CatalogTable.playbooks },
  { tableId: CatalogTable.roleRefs, field: 'roleId', parentTableId: CatalogTable.roles },
  { tableId: CatalogTable.stackRefs, field: 'stackId', parentTableId: CatalogTable.stacks },
  {
    tableId: CatalogTable.pipelineRoles,
    field: 'pipelineId',
    parentTableId: CatalogTable.pipelines,
  },
  { tableId: CatalogTable.pipelineRoles, field: 'roleId', parentTableId: CatalogTable.roles },
  {
    tableId: CatalogTable.launchProfiles,
    field: 'pipelineId',
    parentTableId: CatalogTable.pipelines,
  },
];

export enum CatalogScope {
  HEAD = 'HEAD',
  DRAFT = 'DRAFT',
  REVISION = 'REVISION',
}

export enum CatalogChangeType {
  ADDED = 'ADDED',
  MODIFIED = 'MODIFIED',
  REMOVED = 'REMOVED',
  RENAMED = 'RENAMED',
  RENAMED_AND_MODIFIED = 'RENAMED_AND_MODIFIED',
}

export enum MethodDocumentKind {
  method = 'method',
  template = 'template',
  checklist = 'checklist',
  nav = 'nav',
}

export enum PipelineRoleMembership {
  required = 'required',
  optional = 'optional',
  alternative = 'alternative',
}

export enum LaunchProfileStatus {
  active = 'active',
  deprecated = 'deprecated',
}

export const CatalogError = {
  cannotDeletePlaybook: 'Cannot delete: catalog records still reference this playbook',
  cannotDeleteReferenced: 'Cannot delete: catalog records still reference this record',
  invalidImport: 'Catalog import is invalid',
  invalidMessage: 'Message is required',
  invalidProfile: 'Launch Profile is invalid',
  invalidRelation: 'Catalog relation is invalid',
  noChanges: 'There are no changes',
  recordUnavailable: 'Record unavailable',
} as const;

export const CATALOG_INTERNAL_PAGE_SIZE = 1000;

const writableCreate = new Set<CatalogTable>(CATALOG_WRITABLE_CREATE_TABLES);
const writableUpdate = new Set<CatalogTable>(CATALOG_WRITABLE_UPDATE_TABLES);
const writableDelete = new Set<CatalogTable>(CATALOG_WRITABLE_DELETE_TABLES);

export const canCreateCatalogTable = (tableId: CatalogTable): boolean =>
  writableCreate.has(tableId);
export const canUpdateCatalogTable = (tableId: CatalogTable): boolean =>
  writableUpdate.has(tableId);
export const canDeleteCatalogTable = (tableId: CatalogTable): boolean =>
  writableDelete.has(tableId);
