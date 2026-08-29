import { describe, expect, test } from 'vitest';

import { parseCatalogImport } from '../src/features/playbook-catalog/commands/handlers/import-catalog.parser.js';
import { CatalogTable } from '../src/features/playbook-catalog/contracts/catalog-table.js';
import { CatalogError } from '../src/features/playbook-catalog/contracts/catalog.errors.js';
import {
  toCatalogChange,
  toCatalogChanges,
} from '../src/features/playbook-catalog/engine/catalog-change.mapper.js';

describe('Playbook Catalog boundaries', () => {
  test('parses a catalog import and rejects malformed payloads', () => {
    expect(() => parseCatalogImport(null)).toThrow(CatalogError.invalidImport);
    expect(() => parseCatalogImport({ version: 1 })).toThrow(CatalogError.invalidImport);
    expect(() => parseCatalogImport({ version: 2, tables: {} })).toThrow(
      CatalogError.invalidImport,
    );
    expect(() => parseCatalogImport({ version: 1, tables: [] })).toThrow(
      CatalogError.invalidImport,
    );
    expect(() => parseCatalogImport({ version: 1, tables: { unknown: [] } })).toThrow(
      CatalogError.invalidImport,
    );
    expect(() => parseCatalogImport({ version: 1, tables: { playbooks: {} } })).toThrow(
      CatalogError.invalidImport,
    );
    expect(() => parseCatalogImport({ version: 1, tables: { playbooks: [{ id: '' }] } })).toThrow(
      CatalogError.invalidImport,
    );
    for (const id of [null, 123, 'invalid.record', 'a'.repeat(65)]) {
      expect(() => parseCatalogImport({ version: 1, tables: { playbooks: [{ id }] } })).toThrow(
        CatalogError.invalidImport,
      );
    }
    expect(() =>
      parseCatalogImport({
        version: 1,
        tables: { playbooks: [{ id: 'same' }, { id: 'same' }] },
      }),
    ).toThrow(CatalogError.invalidImport);

    const parsed = parseCatalogImport({
      version: 1,
      tables: { playbooks: [{ id: 'revo', name: 'Revo' }] },
    });
    expect(parsed.get(CatalogTable.playbooks)).toEqual([{ id: 'revo', data: { name: 'Revo' } }]);
    expect(parsed.get(CatalogTable.roles)).toEqual([]);
  });

  test('maps engine row changes and drops non-catalog tables', () => {
    const change = {
      table: { id: CatalogTable.playbooks },
      fromTable: undefined,
      row: { id: 'pb-1', createdId: 'c1' },
      fromRow: { id: 'pb-1' },
      changeType: 'updated',
      fieldChanges: [{ fieldPath: 'name' }],
    };
    expect(toCatalogChange(change as never)).toMatchObject({
      entryId: 'c1',
      recordId: 'pb-1',
      tableId: CatalogTable.playbooks,
    });
    expect(
      toCatalogChange({
        ...change,
        row: { id: 'pb-2', createdId: 'c2' },
        fromRow: { id: 'pb-1' },
      } as never),
    ).toMatchObject({ recordId: 'pb-2', previousRecordId: 'pb-1' });
    expect(
      toCatalogChange({
        ...change,
        table: undefined,
        fromTable: { id: 'other' },
      } as never),
    ).toBeUndefined();
    expect(toCatalogChange({ ...change, row: null, fromRow: null } as never)).toBeUndefined();

    const mapped = toCatalogChanges({
      edges: [
        { cursor: 'a', node: change },
        { cursor: 'b', node: { ...change, table: { id: 'skip' }, fromTable: undefined } },
      ],
      totalCount: 2,
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    } as never);
    expect(mapped.totalCount).toBe(1);
    expect(mapped.edges).toHaveLength(1);
  });
});
