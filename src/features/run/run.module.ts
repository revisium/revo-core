import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AgentRuntimeModule } from '../../infrastructure/agent-runtime/agent-runtime.module.js';
import { PlaybookCatalogModule } from '../playbook-catalog/playbook-catalog.module.js';
import { RUN_COMMAND_HANDLERS } from './commands/index.js';
import { TemporaryRunDirectoryHost } from './infrastructure/working-directory/temporary-run-directory-host.js';
import { RUN_QUERY_HANDLERS } from './queries/index.js';
import { RevoRunService } from './revo-run.service.js';
import { RunApiService } from './run-api.service.js';

@Module({
  imports: [CqrsModule, PlaybookCatalogModule, AgentRuntimeModule],
  providers: [
    TemporaryRunDirectoryHost,
    RevoRunService,
    RunApiService,
    ...RUN_COMMAND_HANDLERS,
    ...RUN_QUERY_HANDLERS,
  ],
  exports: [RunApiService],
})
export class RunModule {}
