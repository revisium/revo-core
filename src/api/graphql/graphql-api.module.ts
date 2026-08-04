import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

import { SystemModule } from '../../features/system/system.module.js';
import { SystemResolver } from './system/system.resolver.js';

@Module({
  imports: [
    SystemModule,
    GraphQLModule.forRoot<YogaDriverConfig>({
      driver: YogaDriver,
      autoSchemaFile: true,
      sortSchema: true,
      path: '/graphql',
    }),
  ],
  providers: [SystemResolver],
})
export class GraphqlApiModule {}
