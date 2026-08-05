import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { RUN_COMMAND_HANDLERS } from './commands/index.js';
import { MvpRunExecutor } from './mvp-run-executor.js';
import { RUN_QUERY_HANDLERS } from './queries/index.js';
import { RevoRunService } from './revo-run.service.js';
import { RunApiService } from './run-api.service.js';

@Module({
  imports: [CqrsModule],
  providers: [
    MvpRunExecutor,
    RevoRunService,
    RunApiService,
    ...RUN_COMMAND_HANDLERS,
    ...RUN_QUERY_HANDLERS,
  ],
  exports: [RunApiService],
})
export class RunModule {}
