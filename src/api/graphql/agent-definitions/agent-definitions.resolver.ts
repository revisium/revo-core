import { UseFilters } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';

import { AgentDefinitionsApiService } from '../../../features/agent-definitions/agent-definitions-api.service.js';
import { AgentDefinitionsGraphqlExceptionFilter } from './agent-definitions-graphql-exception.filter.js';
import {
  AgentConfigurationCatalogModel,
  AgentDefinitionConnectionModel,
  AgentDescriptorModel,
} from './model/index.js';

@Resolver()
@UseFilters(AgentDefinitionsGraphqlExceptionFilter)
export class AgentDefinitionsResolver {
  constructor(private readonly definitions: AgentDefinitionsApiService) {}

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

  @Query(() => AgentConfigurationCatalogModel)
  inspectAgentConfiguration(
    @Args('agentId') agentId: string,
    @Args('agentVersion') agentVersion: string,
  ) {
    return this.definitions.inspectConfiguration(agentId, agentVersion);
  }
}
