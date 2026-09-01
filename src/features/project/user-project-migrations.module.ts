import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ProjectModule } from './project.module.js';
import { UserProjectMigrationsService } from './user-project-migrations.service.js';

@Module({
  imports: [CqrsModule, ProjectModule],
  providers: [UserProjectMigrationsService],
})
export class UserProjectMigrationsModule {}
