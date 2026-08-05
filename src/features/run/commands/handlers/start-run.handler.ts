import { BadRequestException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { compilePipeline } from '@revisium/revo-pipeline';
import { nanoid } from 'nanoid';

import { RevoRunService } from '../../revo-run.service.js';
import { StartRunCommand, type StartRunCommandReturnType } from '../impl/start-run.command.js';

@CommandHandler(StartRunCommand)
export class StartRunHandler implements ICommandHandler<
  StartRunCommand,
  StartRunCommandReturnType
> {
  constructor(private readonly runs: RevoRunService) {}

  execute(command: StartRunCommand): Promise<StartRunCommandReturnType> {
    const compilation = compilePipeline(command.data.pipeline);

    if (!compilation.ok) {
      throw new BadRequestException({
        message: 'Pipeline definition is invalid.',
        faults: compilation.faults,
      });
    }

    return this.runs.startRun({
      runId: nanoid(),
      executionPlan: compilation.template,
      input: command.data.input,
    });
  }
}
