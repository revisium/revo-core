import type { Row } from '@revisium/engine';

import type { CatalogRecord, CatalogRecordData } from '../contracts/catalog.types.js';

export function asCatalogData(value: unknown): CatalogRecordData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return { ...value };
}

export function toCatalogRecord<Data extends object = CatalogRecordData>(
  row: Pick<Row, 'id' | 'data'>,
  revisionId: string,
  isHead: boolean,
  data: Data = asCatalogData(row.data) as Data,
): CatalogRecord<Data> {
  return {
    id: row.id,
    ...data,
    revisionId,
    isHead,
  };
}
