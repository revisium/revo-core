import { Module } from '@nestjs/common';

import { ProjectModule } from './project.module.js';
import { UserProjectMigrationsService } from './user-project-migrations.service.js';

@Module({
  imports: [ProjectModule],
  providers: [UserProjectMigrationsService],
})
export class UserProjectMigrationsModule {}
