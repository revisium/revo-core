import type { EngineApiService } from '@revisium/engine';

import { CATALOG_TABLES, type CatalogTable } from '../contracts/catalog-table.js';
import { CatalogChangeType } from '../contracts/catalog.enums.js';
import type { CatalogChangeEntry, CatalogChanges } from '../contracts/catalog.types.js';

export type EngineRowChange = Awaited<
  ReturnType<EngineApiService['rowChanges']>
>['edges'][number]['node'];

export function toCatalogChange(change: EngineRowChange): CatalogChangeEntry | undefined {
  const tableId = (change.table?.id ?? change.fromTable?.id) as CatalogTable | undefined;

  if (tableId === undefined || !CATALOG_TABLES.includes(tableId)) {
    return undefined;
  }

  const row = change.row ?? change.fromRow;

  if (row === null) {
    return undefined;
  }

  const recordId = change.row?.id ?? row.id;
  const previousRecordId = change.fromRow?.id;

  return {
    entryId: row.createdId,
    tableId,
    recordId,
    ...(previousRecordId === undefined || previousRecordId === recordId
      ? {}
      : { previousRecordId }),
    changeType: change.changeType as unknown as CatalogChangeType,
    fieldPaths: change.fieldChanges.map(({ fieldPath }) => fieldPath),
  };
}

export function toCatalogChanges(
  page: Awaited<ReturnType<EngineApiService['rowChanges']>>,
): CatalogChanges {
  const edges = page.edges.flatMap((edge) => {
    const node = toCatalogChange(edge.node);

    return node === undefined ? [] : [{ cursor: edge.cursor, node }];
  });

  return {
    ...page,
    totalCount: edges.length === page.edges.length ? page.totalCount : edges.length,
    edges,
  };
}
