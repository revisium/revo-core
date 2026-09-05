import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

import { AgentSessionModule } from '../../features/agent-session/agent-session.module.js';
import { PlaybookCatalogModule } from '../../features/playbook-catalog/playbook-catalog.module.js';
import { ProjectModule } from '../../features/project/project.module.js';
import { RunModule } from '../../features/run/run.module.js';
import { SystemModule } from '../../features/system/system.module.js';
import { AgentSessionGraphqlExceptionFilter } from './agent-session/agent-session-graphql-exception.filter.js';
import { AgentSessionResolver } from './agent-session/agent-session.resolver.js';
import { initRegisterEnumTypes } from './init-register-enum-types.js';
import { PlaybookCatalogResolver } from './playbook-catalog/playbook-catalog.resolver.js';
import { ProjectRecordsResolver } from './project/project-records.resolver.js';
import { ProjectResolver } from './project/project.resolver.js';
import { RunResolver } from './run/run.resolver.js';
import { SystemResolver } from './system/system.resolver.js';

initRegisterEnumTypes();

@Module({
  imports: [
    AgentSessionModule,
    ProjectModule,
    PlaybookCatalogModule,
    RunModule,
    SystemModule,
    GraphQLModule.forRoot<YogaDriverConfig>({
      driver: YogaDriver,
      autoSchemaFile: true,
      sortSchema: true,
      path: '/graphql',
    }),
  ],
  providers: [
    AgentSessionResolver,
    AgentSessionGraphqlExceptionFilter,
    ProjectResolver,
    ProjectRecordsResolver,
    PlaybookCatalogResolver,
    RunResolver,
    SystemResolver,
  ],
})
export class GraphqlApiModule {}
