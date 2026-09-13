import { Module } from '@nestjs/common';

import { FileSystemAccessModule } from '../../features/file-system-access/file-system-access.module.js';
import { FileSystemModule } from '../../features/file-system/file-system.module.js';
import { PlaybookCatalogModule } from '../../features/playbook-catalog/playbook-catalog.module.js';
import { ProjectModule } from '../../features/project/project.module.js';
import { RunModule } from '../../features/run/run.module.js';
import { SystemModule } from '../../features/system/system.module.js';
import { WorkspaceModule } from '../../features/workspace/workspace.module.js';
import { FileSystemBrowserAccessService } from '../file-system/file-system-browser-access.service.js';
import { WorkspaceRequestContextService } from '../workspace/workspace-request-context.service.js';
import { FileSystemController } from './file-system/file-system.controller.js';
import { CatalogRecordsController } from './playbook-catalog/catalog-records.controller.js';
import { CatalogController } from './playbook-catalog/catalog.controller.js';
import { AdrController } from './project/adr.controller.js';
import { ProjectController } from './project/project.controller.js';
import { RequirementController } from './project/requirement.controller.js';
import { WorkItemController } from './project/work-item.controller.js';
import { WorkPlanController } from './project/work-plan.controller.js';
import { RunController } from './run/run.controller.js';
import { SystemController } from './system/system.controller.js';
import { WorkspaceController } from './workspace/workspace.controller.js';

@Module({
  imports: [
    WorkspaceModule,
    FileSystemAccessModule,
    FileSystemModule,
    ProjectModule,
    PlaybookCatalogModule,
    RunModule,
    SystemModule,
  ],
  providers: [FileSystemBrowserAccessService, WorkspaceRequestContextService],
  controllers: [
    WorkspaceController,
    FileSystemController,
    CatalogController,
    CatalogRecordsController,
    ProjectController,
    AdrController,
    RequirementController,
    WorkPlanController,
    WorkItemController,
    RunController,
    SystemController,
  ],
})
export class RestApiModule {}
