import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CATALOG_BRANCH_NAME, CATALOG_PROJECT_ID } from '../../engine/catalog-engine.constants.js';
import {
  DiscardCatalogCommand,
  type DiscardCatalogCommandReturnType,
} from '../impl/discard-catalog.command.js';

@CommandHandler(DiscardCatalogCommand)
export class DiscardCatalogHandler implements ICommandHandler<
  DiscardCatalogCommand,
  DiscardCatalogCommandReturnType
> {
  constructor(private readonly engine: EngineApiService) {}

  async execute(): Promise<DiscardCatalogCommandReturnType> {
    const branch = await this.engine.getBranch({
      projectId: CATALOG_PROJECT_ID,
      branchName: CATALOG_BRANCH_NAME,
    });

    if (await this.engine.getTouchedByBranchId(branch.id)) {
      await this.engine.revertChanges({
        projectId: CATALOG_PROJECT_ID,
        branchName: CATALOG_BRANCH_NAME,
      });
    }

    const head = await this.engine.getHeadRevision(branch.id);
    const draft = await this.engine.getDraftRevision(branch.id);

    return {
      status: {
        headRevisionId: head.id,
        draftRevisionId: draft.id,
        hasChanges: false,
        totalChanges: 0,
      },
      changes: {
        edges: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      },
    };
  }
}
