import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { RunRuntimeModule } from '../../infrastructure/run-runtime/run-runtime.module.js';
import { PlaybookCatalogModule } from '../playbook-catalog/playbook-catalog.module.js';
import { ProjectModule } from '../project/project.module.js';
import { RUN_COMMAND_HANDLERS } from './commands/index.js';
import { RUN_QUERY_HANDLERS } from './queries/index.js';
import { RunApiService } from './run-api.service.js';

@Module({
  imports: [CqrsModule, PlaybookCatalogModule, ProjectModule, RunRuntimeModule],
  providers: [RunApiService, ...RUN_COMMAND_HANDLERS, ...RUN_QUERY_HANDLERS],
  exports: [RunApiService],
})
export class RunModule {}
