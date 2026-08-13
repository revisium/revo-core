import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import {
  CleanupProjectDatasetCommand,
  type CleanupProjectDatasetCommandReturnType,
} from '../impl/cleanup-project-dataset.command.js';

@CommandHandler(CleanupProjectDatasetCommand)
export class CleanupProjectDatasetHandler implements ICommandHandler<
  CleanupProjectDatasetCommand,
  CleanupProjectDatasetCommandReturnType
> {
  constructor(private readonly engine: EngineApiService) {}

  async execute({
    data,
  }: CleanupProjectDatasetCommand): Promise<CleanupProjectDatasetCommandReturnType> {
    await this.engine.cleanupProjectFileUsage({ projectId: data.projectId });
    await this.engine.cleanOrphanedData();
    return true;
  }
}
