import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
  ApplyContentModelCommand,
  type ApplyContentModelCommandReturnType,
} from './commands/impl/apply-content-model.command.js';
import {
  DeleteUserProjectCommand,
  type DeleteUserProjectCommandReturnType,
} from './commands/impl/delete-user-project.command.js';
import {
  ListUnfinishedUserProjectIdsQuery,
  type ListUnfinishedUserProjectIdsQueryReturnType,
} from './queries/impl/list-unfinished-user-project-ids.query.js';
import {
  ListUserProjectIdsQuery,
  type ListUserProjectIdsQueryReturnType,
} from './queries/impl/list-user-project-ids.query.js';

@Injectable()
export class UserProjectMigrationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UserProjectMigrationsService.name);

  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.removeUnfinishedProjects();
    await this.applyToUserProjects();
  }

  private async removeUnfinishedProjects(): Promise<void> {
    const projectIds = await this.queries.execute<
      ListUnfinishedUserProjectIdsQuery,
      ListUnfinishedUserProjectIdsQueryReturnType
    >(new ListUnfinishedUserProjectIdsQuery({}));

    for (const projectId of projectIds) {
      // oxlint-disable-next-line no-await-in-loop -- Remove one project at a time; failures stay isolated.
      await this.removeUnfinishedProject(projectId);
    }
  }

  private async removeUnfinishedProject(projectId: string): Promise<void> {
    try {
      await this.commands.execute<DeleteUserProjectCommand, DeleteUserProjectCommandReturnType>(
        new DeleteUserProjectCommand({ projectId }),
      );
    } catch (error) {
      this.logger.error(`Unfinished project ${projectId} was not removed: ${reason(error)}`);
    }
  }

  private async applyToUserProjects(): Promise<void> {
    const projectIds = await this.queries.execute<
      ListUserProjectIdsQuery,
      ListUserProjectIdsQueryReturnType
    >(new ListUserProjectIdsQuery({}));

    for (const projectId of projectIds) {
      // oxlint-disable-next-line no-await-in-loop -- Apply one project at a time; failures stay isolated.
      await this.applyToUserProject(projectId);
    }
  }

  private async applyToUserProject(projectId: string): Promise<void> {
    try {
      await this.commands.execute<ApplyContentModelCommand, ApplyContentModelCommandReturnType>(
        new ApplyContentModelCommand({ projectId }),
      );
    } catch (error) {
      this.logger.error(`Content model was not updated for ${projectId}: ${reason(error)}`);
    }
  }
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
