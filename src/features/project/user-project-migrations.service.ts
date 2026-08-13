import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
  ApplyContentModelCommand,
  type ApplyContentModelCommandReturnType,
} from './commands/impl/apply-content-model.command.js';
import {
  ListUserProjectIdsQuery,
  type ListUserProjectIdsQueryReturnType,
} from './queries/impl/list-user-project-ids.query.js';

@Injectable()
export class UserProjectMigrationsService implements OnApplicationBootstrap {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  onApplicationBootstrap(): Promise<void> {
    return this.applyToUserProjects();
  }

  private async applyToUserProjects(): Promise<void> {
    const projectIds = await this.queries.execute<
      ListUserProjectIdsQuery,
      ListUserProjectIdsQueryReturnType
    >(new ListUserProjectIdsQuery({}));
    for (const projectId of projectIds) {
      // oxlint-disable-next-line no-await-in-loop -- Apply one project at a time. The first failure aborts bootstrap.
      await this.commands.execute<ApplyContentModelCommand, ApplyContentModelCommandReturnType>(
        new ApplyContentModelCommand({ projectId }),
      );
    }
  }
}
