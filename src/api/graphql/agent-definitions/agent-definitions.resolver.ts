import { UseFilters } from '@nestjs/common';
import { Args, Int, Query, Resolver, Subscription } from '@nestjs/graphql';

import { AgentDefinitionsApiService } from '../../../features/agent-definitions/agent-definitions-api.service.js';
import { AgentDefinitionsGraphqlExceptionFilter } from './agent-definitions-graphql-exception.filter.js';
import { AgentConfigurationsModel } from './model/agent-configurations.model.js';
import { AgentDefinitionConnectionModel, AgentDescriptorModel } from './model/index.js';

@Resolver()
@UseFilters(AgentDefinitionsGraphqlExceptionFilter)
export class AgentDefinitionsResolver {
  constructor(private readonly definitions: AgentDefinitionsApiService) {}

  @Query(() => AgentConfigurationsModel)
  agentConfigurations() {
    return this.definitions.configurations();
  }

  @Subscription(() => AgentConfigurationsModel, {
    name: 'agentConfigurations',
    resolve: (state: unknown) => state,
  })
  watchAgentConfigurations() {
    return this.definitions.watchConfigurations();
  }

  @Query(() => AgentDefinitionConnectionModel)
  agentDefinitions(
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('after', { nullable: true }) after?: string,
  ) {
    return this.definitions.list({
      ...(first == null ? {} : { first }),
      ...(after == null ? {} : { after }),
    });
  }

  @Query(() => AgentDescriptorModel, { nullable: true })
  agentDefinition(@Args('agentId') agentId: string, @Args('agentVersion') agentVersion: string) {
    return this.definitions.get(agentId, agentVersion);
  }
}
