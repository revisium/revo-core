import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { errorReason } from '../../infrastructure/error-reason.js';
import {
  DeleteUserProjectCommand,
  type DeleteUserProjectCommandReturnType,
} from './commands/impl/delete-user-project.command.js';
import { ProjectContentModelService } from './project-content-model.service.js';
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
    private readonly contentModel: ProjectContentModelService,
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
      this.logger.error(`Unfinished project ${projectId} was not removed: ${errorReason(error)}`);
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
      await this.contentModel.apply(projectId);
    } catch (error) {
      this.logger.error(`Content model was not updated for ${projectId}: ${errorReason(error)}`);
    }
  }
}
