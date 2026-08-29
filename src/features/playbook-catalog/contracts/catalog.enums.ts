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
