export const CATALOG_RECORD_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isCatalogRecordId(value: unknown): value is string {
  return typeof value === 'string' && CATALOG_RECORD_ID_PATTERN.test(value);
}
