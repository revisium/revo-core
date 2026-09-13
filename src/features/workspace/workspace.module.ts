import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { FileSystemModule } from '../file-system/file-system.module.js';
import { ProjectModule } from '../project/project.module.js';
import { WorkspaceProjectService } from './application/workspace-project.service.js';
import { CheckWorkspaceHandler } from './commands/handlers/check-workspace.handler.js';
import { CreateWorkspaceHandler } from './commands/handlers/create-workspace.handler.js';
import { DisconnectWorkspaceHandler } from './commands/handlers/disconnect-workspace.handler.js';
import { UpdateWorkspaceHandler } from './commands/handlers/update-workspace.handler.js';
import { GetWorkspaceHandler } from './queries/handlers/get-workspace.handler.js';
import { ListWorkspacesHandler } from './queries/handlers/list-workspaces.handler.js';
import { GitWorkspaceAccessService } from './source/git-workspace-access.service.js';
import { GitWorkspaceProbe } from './source/git-workspace-probe.js';
import { LocalWorkspaceSourceService } from './source/local-workspace-source.service.js';
import { WorkspaceStoreService } from './storage/workspace-store.service.js';
import { WorkspaceApiService } from './workspace-api.service.js';

@Module({
  imports: [CqrsModule, ConfigModule, DatabaseModule, ProjectModule, FileSystemModule],
  providers: [
    GitWorkspaceAccessService,
    WorkspaceApiService,
    WorkspaceProjectService,
    WorkspaceStoreService,
    LocalWorkspaceSourceService,
    GitWorkspaceProbe,
    CreateWorkspaceHandler,
    UpdateWorkspaceHandler,
    DisconnectWorkspaceHandler,
    CheckWorkspaceHandler,
    GetWorkspaceHandler,
    ListWorkspacesHandler,
  ],
  exports: [WorkspaceApiService],
})
export class WorkspaceModule {}
