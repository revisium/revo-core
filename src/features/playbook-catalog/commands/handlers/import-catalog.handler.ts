import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService, type InputJsonValue } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import type { CatalogImportTableResult } from '../../catalog.types.js';
import { CATALOG_TABLES, CatalogTable } from '../../constants/catalog.constants.js';
import {
  type CatalogImportRecord,
  type CatalogImportTables,
  parseCatalogImport,
} from '../../domain/catalog-import.js';
import {
  ImportCatalogCommand,
  type ImportCatalogCommandReturnType,
} from '../impl/import-catalog.command.js';

@CommandHandler(ImportCatalogCommand)
export class ImportCatalogHandler implements ICommandHandler<
  ImportCatalogCommand,
  ImportCatalogCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ImportCatalogCommand): Promise<ImportCatalogCommandReturnType> {
    const tables = parseCatalogImport(data.payload);
    const revisionId = await this.drafts.getDraftRevisionId();

    return { tables: await this.upsertTables(revisionId, tables) };
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

    if (existing === null) {
      await this.engine.createRow({
        revisionId,
        tableId,
        rowId: row.id,
        data: row.data as InputJsonValue,
      });

      return true;
    }

    await this.engine.updateRow({
      revisionId,
      tableId,
      rowId: row.id,
      data: row.data as InputJsonValue,
    });

    return false;
  }
}
