import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

import { RunModule } from '../../features/run/run.module.js';
import { SystemModule } from '../../features/system/system.module.js';
import { RunResolver } from './run/run.resolver.js';
import { SystemResolver } from './system/system.resolver.js';

@Module({
  imports: [
    RunModule,
    SystemModule,
    GraphQLModule.forRoot<YogaDriverConfig>({
      driver: YogaDriver,
      autoSchemaFile: true,
      sortSchema: true,
      path: '/graphql',
    }),
  ],
  providers: [RunResolver, SystemResolver],
})
export class GraphqlApiModule {}
