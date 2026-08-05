import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
  StartRunCommand,
  type StartRunCommandData,
  type StartRunCommandReturnType,
} from './commands/index.js';
import { GetRunQuery, type GetRunQueryData, type GetRunQueryReturnType } from './queries/index.js';

@Injectable()
export class RunApiService {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  startRun(data: StartRunCommandData): Promise<StartRunCommandReturnType> {
    return this.commands.execute<StartRunCommand, StartRunCommandReturnType>(
      new StartRunCommand(data),
    );
  }

  getRun(data: GetRunQueryData): Promise<GetRunQueryReturnType> {
    return this.queries.execute<GetRunQuery, GetRunQueryReturnType>(new GetRunQuery(data));
  }
}
