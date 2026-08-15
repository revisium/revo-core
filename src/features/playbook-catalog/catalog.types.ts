import type { IPaginatedType } from '@revisium/engine';

import type {
  CatalogChangeType,
  CatalogScope,
  CatalogTable,
} from './constants/catalog.constants.js';

export type CatalogRecordData = Record<string, unknown>;

export type CatalogRecord = {
  id: string;
  revisionId: string;
  isHead: boolean;
} & CatalogRecordData;

export type CatalogReadSelector = {
  readonly scope?: CatalogScope;
  readonly revisionId?: string;
};

export type CatalogPageData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
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

export type CatalogChanges = IPaginatedType<CatalogChangeEntry>;

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
  tables: Record<CatalogTable, CatalogRecord[]>;
};
