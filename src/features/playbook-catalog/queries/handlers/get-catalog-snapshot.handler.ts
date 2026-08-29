import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService, type Row } from '@revisium/engine';

import { CATALOG_TABLES, CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogScope } from '../../contracts/catalog.enums.js';
import type { CatalogRecord, CatalogSnapshotTables } from '../../contracts/catalog.types.js';
import { decodeCatalogRecordData } from '../../engine/catalog-record.codec.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  GetCatalogSnapshotQuery,
  type GetCatalogSnapshotQueryReturnType,
} from '../impl/get-catalog-snapshot.query.js';

const SNAPSHOT_PAGE_SIZE = 1000;

@QueryHandler(GetCatalogSnapshotQuery)
export class GetCatalogSnapshotHandler implements IQueryHandler<
  GetCatalogSnapshotQuery,
  GetCatalogSnapshotQueryReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetCatalogSnapshotQuery): Promise<GetCatalogSnapshotQueryReturnType> {
    const { revisionId, isHead } = await this.revisions.resolveRevision({
      scope: CatalogScope.REVISION,
      revisionId: data.revisionId,
    });
    const entries = await Promise.all(
      CATALOG_TABLES.map(async (tableId): Promise<[CatalogTable, CatalogRecord<object>[]]> => [
        tableId,
        (await this.readTable(revisionId, tableId)).map((row) =>
          toCatalogRecord(row, revisionId, isHead, decodeCatalogRecordData(tableId, row.data)),
        ),
      ]),
    );

    return {
      revisionId,
      isHead,
      tables: Object.fromEntries(entries) as CatalogSnapshotTables,
    };
  }

  private async readTable(revisionId: string, tableId: CatalogTable): Promise<Row[]> {
    const rows: Row[] = [];
    let after: string | undefined;

    do {
      const page = await this.engine.getRows({
        revisionId,
        tableId,
        first: SNAPSHOT_PAGE_SIZE,
        ...(after === undefined ? {} : { after }),
      });
      rows.push(...page.edges.map(({ node }) => node));
      after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : undefined;
    } while (after !== undefined);

    return rows;
  }
}
