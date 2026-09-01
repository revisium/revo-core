import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HashService, IdService, ShareModule } from '@revisium/engine';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { PROJECT_COMMAND_HANDLERS } from './commands/index.js';
import { ProjectApiService } from './project-api.service.js';
import { ProjectContentModelService } from './project-content-model.service.js';
import { ProjectDraftService } from './project-draft.service.js';
import { PROJECT_QUERY_HANDLERS } from './queries/index.js';

@Module({
  imports: [CqrsModule, DatabaseModule, ShareModule],
  providers: [
    IdService,
    HashService,
    ProjectDraftService,
    ProjectContentModelService,
    ProjectApiService,
    ...PROJECT_COMMAND_HANDLERS,
    ...PROJECT_QUERY_HANDLERS,
  ],
  exports: [ProjectApiService, ProjectContentModelService],
})
export class ProjectModule {}
