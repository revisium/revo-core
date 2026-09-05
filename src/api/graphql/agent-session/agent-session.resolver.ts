import { UseFilters } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';

import { AgentSessionApiService } from '../../../features/agent-session/agent-session-api.service.js';
import { parseAgentSessionResponse } from '../../../features/agent-session/contracts/agent-session-response.js';
import { AgentSessionGraphqlExceptionFilter } from './agent-session-graphql-exception.filter.js';
import { AgentConfigurationSelectionInput } from './input/agent-configuration-selection.input.js';
import {
  AgentSessionEventCursorInput,
  AgentSessionResumeTokenInput,
  RespondAgentSessionInput,
} from './input/agent-session.input.js';
import { AgentDefinitionConnectionModel } from './model/agent-definition-connection.model.js';
import {
  AgentConfigurationCatalogModel,
  AgentDescriptorModel,
  AgentSessionConnectionModel,
  AgentSessionCheckpointModel,
  AgentSessionHibernateModel,
  AgentSessionEventUnion,
  AgentSessionOpenedModel,
  AgentSessionOperationResultModel,
  AgentSessionSnapshotModel,
  AgentSessionTerminalModel,
  AgentSessionTurnModel,
  AgentSessionTurnResultModel,
  AgentSessionTurnStartedModel,
  TerminalAgentSessionConnectionModel,
} from './model/index.js';

@Resolver()
@UseFilters(AgentSessionGraphqlExceptionFilter)
export class AgentSessionResolver {
  constructor(private readonly sessions: AgentSessionApiService) {}

  @Query(() => AgentDefinitionConnectionModel)
  agentSessionAgents(
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('after', { nullable: true }) after?: string,
  ) {
    return this.sessions.listAgents({
      ...(first === undefined ? {} : { first }),
      ...(after === undefined ? {} : { after }),
    });
  }

  @Query(() => AgentDescriptorModel, { nullable: true })
  agentSessionAgent(@Args('agentId') agentId: string, @Args('agentVersion') agentVersion: string) {
    return this.sessions.getAgent(agentId, agentVersion);
  }

  @Query(() => AgentSessionConnectionModel)
  activeAgentSessions(
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('after', { nullable: true }) after?: string,
  ) {
    return this.sessions.listActive({
      ...(first === undefined ? {} : { first }),
      ...(after === undefined ? {} : { after }),
    });
  }

  @Query(() => AgentSessionTerminalModel, { nullable: true })
  terminalAgentSession(@Args('sessionId', { type: () => ID }) sessionId: string) {
    return this.sessions.getTerminal(sessionId);
  }

  @Query(() => TerminalAgentSessionConnectionModel)
  terminalAgentSessions(
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('after', { nullable: true }) after?: string,
  ) {
    return this.sessions.listTerminal({
      ...(first === undefined ? {} : { first }),
      ...(after === undefined ? {} : { after }),
    });
  }

  @Query(() => AgentSessionTurnModel, { nullable: true })
  agentSessionTurn(@Args('turnId', { type: () => ID }) turnId: string) {
    return this.sessions.inspectTurn(turnId);
  }

  @Query(() => AgentConfigurationCatalogModel)
  inspectAgentConfiguration(
    @Args('agentId') agentId: string,
    @Args('agentVersion') agentVersion: string,
  ) {
    return this.sessions.inspectConfiguration(agentId, agentVersion);
  }

  @Query(() => AgentSessionSnapshotModel, { nullable: true })
  agentSession(@Args('sessionId', { type: () => ID }) sessionId: string) {
    return this.sessions.inspect(sessionId);
  }

  @Mutation(() => AgentSessionOpenedModel)
  openAgentSession(
    @Args('agentId') agentId: string,
    @Args('agentVersion') agentVersion: string,
    @Args('configuration', { type: () => AgentConfigurationSelectionInput, nullable: true })
    configuration?: AgentConfigurationSelectionInput,
  ) {
    return this.sessions.open(agentId, agentVersion, configuration);
  }

  @Mutation(() => AgentSessionTurnResultModel)
  sendAgentSessionMessage(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Args('prompt') prompt: string,
  ) {
    return this.sessions.send(sessionId, prompt);
  }

  @Mutation(() => AgentSessionTurnStartedModel)
  startAgentSessionTurn(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Args('prompt') prompt: string,
  ) {
    return this.sessions.startTurn(sessionId, prompt);
  }

  @Mutation(() => AgentSessionTurnResultModel)
  waitForAgentSessionTurn(@Args('turnId', { type: () => ID }) turnId: string) {
    return this.sessions.waitForTurn(turnId);
  }

  @Mutation(() => AgentSessionOperationResultModel)
  cancelAgentSessionTurn(@Args('turnId', { type: () => ID }) turnId: string) {
    return this.sessions.cancelTurn(turnId);
  }

  @Mutation(() => AgentSessionCheckpointModel)
  checkpointAgentSession(@Args('sessionId', { type: () => ID }) sessionId: string) {
    return this.sessions.checkpoint(sessionId);
  }

  @Mutation(() => AgentSessionHibernateModel)
  hibernateAgentSession(@Args('sessionId', { type: () => ID }) sessionId: string) {
    return this.sessions.hibernate(sessionId);
  }

  @Mutation(() => AgentSessionOpenedModel)
  resumeAgentSession(
    @Args('token', { type: () => AgentSessionResumeTokenInput })
    token: AgentSessionResumeTokenInput,
    @Args('configuration', { type: () => AgentConfigurationSelectionInput, nullable: true })
    configuration?: AgentConfigurationSelectionInput,
  ) {
    return this.sessions.resume(token, configuration);
  }

  @Mutation(() => AgentSessionOperationResultModel)
  respondAgentSession(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Args('data') data: RespondAgentSessionInput,
  ) {
    return this.sessions.respond(sessionId, parseAgentSessionResponse(data));
  }

  @Mutation(() => AgentSessionOperationResultModel)
  cancelAgentSession(@Args('sessionId', { type: () => ID }) sessionId: string) {
    return this.sessions.cancel(sessionId);
  }

  @Mutation(() => AgentSessionOperationResultModel)
  closeAgentSession(@Args('sessionId', { type: () => ID }) sessionId: string) {
    return this.sessions.close(sessionId);
  }

  @Subscription(() => AgentSessionEventUnion, { resolve: (event: unknown) => event })
  async agentSessionEvents(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Args('after', { type: () => AgentSessionEventCursorInput, nullable: true })
    after?: AgentSessionEventCursorInput,
  ) {
    return this.sessions.events(sessionId, after);
  }
}
