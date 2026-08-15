import { BadRequestException } from '@nestjs/common';

import type { CatalogRecordData } from '../catalog.types.js';
import { CATALOG_TABLES, CatalogError, CatalogTable } from '../constants/catalog.constants.js';

export type CatalogImportRecord = {
  id: string;
  data: CatalogRecordData;
};

export type CatalogImportTables = Map<CatalogTable, CatalogImportRecord[]>;

export function parseCatalogImport(payload: unknown): CatalogImportTables {
  if (!isObject(payload) || Object.keys(payload).sort().join(',') !== 'tables,version') {
    throw new BadRequestException(CatalogError.invalidImport);
  }

  if (payload.version !== 1 || !isObject(payload.tables)) {
    throw new BadRequestException(CatalogError.invalidImport);
  }

  const tableNames = Object.keys(payload.tables);

  if (tableNames.some((tableId) => !CATALOG_TABLES.includes(tableId as CatalogTable))) {
    throw new BadRequestException(CatalogError.invalidImport);
  }

  const result: CatalogImportTables = new Map();

  for (const tableId of CATALOG_TABLES) {
    result.set(tableId, parseTable(payload.tables[tableId]));
  }

  return result;
}

function parseTable(value: unknown): CatalogImportRecord[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new BadRequestException(CatalogError.invalidImport);
  }

  const ids = new Set<string>();

  return value.map((record) => {
    if (!isObject(record) || typeof record.id !== 'string' || !/^[\w-]{1,64}$/.test(record.id)) {
      throw new BadRequestException(CatalogError.invalidImport);
    }

    if (ids.has(record.id)) {
      throw new BadRequestException(CatalogError.invalidImport);
    }

    ids.add(record.id);
    const { id, ...data } = record;

    return { id, data };
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
