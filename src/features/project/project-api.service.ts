import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
  EnsureProjectCommand,
  type EnsureProjectCommandData,
  type EnsureProjectCommandReturnType,
} from './commands/index.js';
import {
  GetProjectQuery,
  type GetProjectQueryData,
  type GetProjectQueryReturnType,
} from './queries/index.js';

@Injectable()
export class ProjectApiService {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  ensureProject(data: EnsureProjectCommandData): Promise<EnsureProjectCommandReturnType> {
    return this.commands.execute<EnsureProjectCommand, EnsureProjectCommandReturnType>(
      new EnsureProjectCommand(data),
    );
  }

  getProject(data: GetProjectQueryData): Promise<GetProjectQueryReturnType> {
    return this.queries.execute<GetProjectQuery, GetProjectQueryReturnType>(
      new GetProjectQuery(data),
    );
  }
}
