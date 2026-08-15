import type { CatalogRecordData } from '../catalog.types.js';

export function asCatalogData(value: unknown): CatalogRecordData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return { ...value };
}
