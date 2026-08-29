import type { PipelineSourcePackage, RunProfile } from '@revisium/revo-run';

import type { CatalogTable } from './catalog-table.js';
import type { CatalogChangeType, CatalogScope, LaunchProfileStatus } from './catalog.enums.js';

export type CatalogRecordData = Record<string, unknown>;

export type CatalogRecord<Data extends object = CatalogRecordData> = {
  id: string;
  revisionId: string;
  isHead: boolean;
} & Data;

export type PipelineRecordData = {
  playbookId: string;
  pipeline: PipelineSourcePackage;
};

export type PipelineRecord = CatalogRecord<PipelineRecordData>;

export type LaunchProfileRecordData = {
  pipelineId: string;
  status: LaunchProfileStatus;
  profile: RunProfile;
};

export type LaunchProfileRecord = CatalogRecord<LaunchProfileRecordData>;

export type CatalogRecordForTable<Table extends CatalogTable> = Table extends 'pipelines'
  ? PipelineRecord
  : Table extends 'launch_profiles'
    ? LaunchProfileRecord
    : CatalogRecord;

export type CatalogSnapshotTables = {
  [Table in CatalogTable]: CatalogRecordForTable<Table>[];
};

export type CatalogReadSelector = {
  readonly scope?: CatalogScope;
  readonly revisionId?: string;
};

export type CatalogPageData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
};

export type CatalogPage<T> = {
  edges: Array<{ cursor: string; node: T }>;
  totalCount: number;
  pageInfo: {
    endCursor?: string;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
  };
};

export type CatalogStatus = {
  headRevisionId: string;
  draftRevisionId: string;
  hasChanges: boolean;
  totalChanges: number;
};

export type CatalogChangeEntry = {
  entryId: string;
  tableId: CatalogTable;
  recordId: string;
  previousRecordId?: string;
  changeType: CatalogChangeType;
  fieldPaths: string[];
};

export type CatalogChanges = CatalogPage<CatalogChangeEntry>;

export type CatalogMutationResult = {
  status: CatalogStatus;
  changes: CatalogChanges;
};

export type CatalogCommitResult = {
  revisionId: string;
  previousRevisionId: string;
};

export type CatalogImportTableResult = {
  tableId: CatalogTable;
  created: number;
  updated: number;
};

export type CatalogImportResult = {
  tables: CatalogImportTableResult[];
};

export type CatalogSnapshot = {
  revisionId: string;
  isHead: boolean;
  tables: CatalogSnapshotTables;
};
