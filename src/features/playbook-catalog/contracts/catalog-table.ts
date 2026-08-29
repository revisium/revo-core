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
