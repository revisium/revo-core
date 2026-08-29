import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService, type InputJsonValue } from '@revisium/engine';

import { CATALOG_TABLES, CatalogTable } from '../../contracts/catalog-table.js';
import type { CatalogImportTableResult } from '../../contracts/catalog.types.js';
import { encodeCatalogRecordData } from '../../engine/catalog-record.codec.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  ImportCatalogCommand,
  type ImportCatalogCommandReturnType,
} from '../impl/import-catalog.command.js';
import {
  type CatalogImportRecord,
  type CatalogImportTables,
  parseCatalogImport,
} from './import-catalog.parser.js';

@CommandHandler(ImportCatalogCommand)
export class ImportCatalogHandler implements ICommandHandler<
  ImportCatalogCommand,
  ImportCatalogCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ImportCatalogCommand): Promise<ImportCatalogCommandReturnType> {
    const tables = this.encodeTablesForStorage(parseCatalogImport(data.payload));
    const revisionId = await this.revisions.getDraftRevisionId();

    return { tables: await this.upsertTables(revisionId, tables) };
  }

  private encodeTablesForStorage(tables: CatalogImportTables): CatalogImportTables {
    const encoded: CatalogImportTables = new Map();

    for (const tableId of CATALOG_TABLES) {
      encoded.set(
        tableId,
        (tables.get(tableId) ?? []).map((row) => ({
          ...row,
          data: encodeCatalogRecordData(tableId, row.data),
        })),
      );
    }

    return encoded;
  }

  private async upsertTables(
    revisionId: string,
    tables: CatalogImportTables,
  ): Promise<CatalogImportTableResult[]> {
    const results: CatalogImportTableResult[] = [];

    for (const tableId of CATALOG_TABLES) {
      results.push(await this.upsertTable(revisionId, tableId, tables.get(tableId) ?? []));
    }

    return results;
  }

  private async upsertTable(
    revisionId: string,
    tableId: CatalogTable,
    rows: CatalogImportRecord[],
  ): Promise<CatalogImportTableResult> {
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      if (await this.upsertRow(revisionId, tableId, row)) {
        created += 1;
      } else {
        updated += 1;
      }
    }

    return { tableId, created, updated };
  }

  private async upsertRow(
    revisionId: string,
    tableId: CatalogTable,
    row: CatalogImportRecord,
  ): Promise<boolean> {
    const existing = await this.engine.getRow({ revisionId, tableId, rowId: row.id });
    const data = row.data as InputJsonValue;

    if (existing === null) {
      await this.engine.createRow({
        revisionId,
        tableId,
        rowId: row.id,
        data,
      });

      return true;
    }

    await this.engine.updateRow({
      revisionId,
      tableId,
      rowId: row.id,
      data,
    });

    return false;
  }
}
