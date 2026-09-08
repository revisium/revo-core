import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

import { AgentDefinitionsModule } from '../../features/agent-definitions/agent-definitions.module.js';
import { DialogueManagementModule } from '../../features/dialogues/management/dialogue-management.module.js';
import { PlaybookCatalogModule } from '../../features/playbook-catalog/playbook-catalog.module.js';
import { ProjectModule } from '../../features/project/project.module.js';
import { RunModule } from '../../features/run/run.module.js';
import { SystemModule } from '../../features/system/system.module.js';
import { AgentDefinitionsGraphqlExceptionFilter } from './agent-definitions/agent-definitions-graphql-exception.filter.js';
import { AgentDefinitionsResolver } from './agent-definitions/agent-definitions.resolver.js';
import { DialogueResolver } from './dialogue/dialogue.resolver.js';
import { initRegisterEnumTypes } from './init-register-enum-types.js';
import { PlaybookCatalogResolver } from './playbook-catalog/playbook-catalog.resolver.js';
import { ProjectRecordsResolver } from './project/project-records.resolver.js';
import { ProjectResolver } from './project/project.resolver.js';
import { RunResolver } from './run/run.resolver.js';
import { GraphqlSubscriptionTransport } from './subscriptions/graphql-subscription-transport.js';
import { GraphqlSubscriptionsModule } from './subscriptions/graphql-subscriptions.module.js';
import { SystemResolver } from './system/system.resolver.js';

initRegisterEnumTypes();

@Module({
  imports: [
    AgentDefinitionsModule,
    DialogueManagementModule,
    ProjectModule,
    PlaybookCatalogModule,
    RunModule,
    SystemModule,
    GraphQLModule.forRootAsync<YogaDriverConfig>({
      driver: YogaDriver,
      imports: [GraphqlSubscriptionsModule],
      inject: [GraphqlSubscriptionTransport],
      useFactory: (transport: GraphqlSubscriptionTransport) => ({
        autoSchemaFile: true,
        sortSchema: true,
        path: '/graphql',
        plugins: transport.plugins,
      }),
    }),
  ],
  providers: [
    AgentDefinitionsResolver,
    DialogueResolver,
    AgentDefinitionsGraphqlExceptionFilter,
    ProjectResolver,
    ProjectRecordsResolver,
    PlaybookCatalogResolver,
    RunResolver,
    SystemResolver,
  ],
})
export class GraphqlApiModule {}
