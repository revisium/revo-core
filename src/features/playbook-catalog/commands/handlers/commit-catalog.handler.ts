import { BadRequestException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import {
  CATALOG_BRANCH_NAME,
  CATALOG_PROJECT_ID,
  CatalogError,
} from '../../constants/catalog.constants.js';
import {
  CommitCatalogCommand,
  type CommitCatalogCommandReturnType,
} from '../impl/commit-catalog.command.js';

@CommandHandler(CommitCatalogCommand)
export class CommitCatalogHandler implements ICommandHandler<
  CommitCatalogCommand,
  CommitCatalogCommandReturnType
> {
  constructor(private readonly engine: EngineApiService) {}

  async execute({ data }: CommitCatalogCommand): Promise<CommitCatalogCommandReturnType> {
    const message = data.message.trim();

    if (message === '') {
      throw new BadRequestException(CatalogError.invalidMessage);
    }

    const revision = await this.engine.createRevision({
      projectId: CATALOG_PROJECT_ID,
      branchName: CATALOG_BRANCH_NAME,
      comment: message,
    });

    return { revisionId: revision.id, previousRevisionId: revision.previousHeadRevisionId };
  }
}
