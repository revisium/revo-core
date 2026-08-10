import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { IdService } from '@revisium/engine';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { PROJECT_COMMAND_HANDLERS } from './commands/index.js';
import { ProjectApiService } from './project-api.service.js';
import { PROJECT_QUERY_HANDLERS } from './queries/index.js';

@Module({
  imports: [CqrsModule, DatabaseModule],
  providers: [IdService, ProjectApiService, ...PROJECT_COMMAND_HANDLERS, ...PROJECT_QUERY_HANDLERS],
  exports: [ProjectApiService],
})
export class ProjectModule {}
