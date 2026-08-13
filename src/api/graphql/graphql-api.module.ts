import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

import { ProjectModule } from '../../features/project/project.module.js';
import { RunModule } from '../../features/run/run.module.js';
import { SystemModule } from '../../features/system/system.module.js';
import { ProjectRecordsResolver } from './project/project-records.resolver.js';
import { ProjectResolver } from './project/project.resolver.js';
import { RunResolver } from './run/run.resolver.js';
import { SystemResolver } from './system/system.resolver.js';

@Module({
  imports: [
    ProjectModule,
    RunModule,
    SystemModule,
    GraphQLModule.forRoot<YogaDriverConfig>({
      driver: YogaDriver,
      autoSchemaFile: true,
      sortSchema: true,
      path: '/graphql',
    }),
  ],
  providers: [ProjectResolver, ProjectRecordsResolver, RunResolver, SystemResolver],
})
export class GraphqlApiModule {}
