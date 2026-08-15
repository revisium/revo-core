import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService, type Row } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import type { CatalogRecord } from '../../catalog.types.js';
import {
  CATALOG_INTERNAL_PAGE_SIZE,
  CATALOG_TABLES,
  CatalogScope,
  CatalogTable,
} from '../../constants/catalog.constants.js';
import {
  GetCatalogSnapshotQuery,
  type GetCatalogSnapshotQueryReturnType,
} from '../impl/get-catalog-snapshot.query.js';

@QueryHandler(GetCatalogSnapshotQuery)
export class GetCatalogSnapshotHandler implements IQueryHandler<
  GetCatalogSnapshotQuery,
  GetCatalogSnapshotQueryReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetCatalogSnapshotQuery): Promise<GetCatalogSnapshotQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision({
      scope: CatalogScope.REVISION,
      revisionId: data.revisionId,
    });
    const entries = await Promise.all(
      CATALOG_TABLES.map(async (tableId): Promise<[CatalogTable, CatalogRecord[]]> => [
        tableId,
        (await this.readTable(revisionId, tableId)).map((row) =>
          this.drafts.toRecord(row, revisionId, isHead, tableId),
        ),
      ]),
    );

    return {
      revisionId,
      isHead,
      tables: Object.fromEntries(entries) as Record<CatalogTable, CatalogRecord[]>,
    };
  }

  private async readTable(revisionId: string, tableId: CatalogTable): Promise<Row[]> {
    const rows: Row[] = [];
    let after: string | undefined;

    do {
      const page = await this.engine.getRows({
        revisionId,
        tableId,
        first: CATALOG_INTERNAL_PAGE_SIZE,
        ...(after === undefined ? {} : { after }),
      });
      rows.push(...page.edges.map(({ node }) => node));
      after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : undefined;
    } while (after !== undefined);

    return rows;
  }
}
