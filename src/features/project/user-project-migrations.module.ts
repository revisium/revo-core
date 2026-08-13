import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { UserProjectMigrationsService } from './user-project-migrations.service.js';

@Module({
  imports: [CqrsModule],
  providers: [UserProjectMigrationsService],
})
export class UserProjectMigrationsModule {}
