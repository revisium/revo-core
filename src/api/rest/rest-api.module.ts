import { Module } from '@nestjs/common';

import { ProjectModule } from '../../features/project/project.module.js';
import { RunModule } from '../../features/run/run.module.js';
import { SystemModule } from '../../features/system/system.module.js';
import { AdrController } from './project/adr.controller.js';
import { ProjectController } from './project/project.controller.js';
import { RequirementController } from './project/requirement.controller.js';
import { WorkItemController } from './project/work-item.controller.js';
import { WorkPlanController } from './project/work-plan.controller.js';
import { RunController } from './run/run.controller.js';
import { SystemController } from './system/system.controller.js';

@Module({
  imports: [ProjectModule, RunModule, SystemModule],
  controllers: [
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
