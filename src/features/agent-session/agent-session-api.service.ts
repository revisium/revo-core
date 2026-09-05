import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { mapAgentSessionError } from '../../infrastructure/agent-runtime/agent-session.errors.js';
import {
  CancelAgentSessionCommand,
  CancelAgentSessionTurnCommand,
  CheckpointAgentSessionCommand,
  CloseAgentSessionCommand,
  HibernateAgentSessionCommand,
  OpenAgentSessionCommand,
  RespondAgentSessionCommand,
  ResumeAgentSessionCommand,
  SendAgentSessionMessageCommand,
  StartAgentSessionTurnCommand,
} from './commands/agent-session.commands.js';
import type {
  AgentConfigurationSelectionData,
  AgentSessionEventCursorData,
  AgentSessionPageData,
  AgentSessionResumeTokenData,
  RespondAgentSessionData,
} from './contracts/agent-session.contracts.js';
import {
  GetAgentDefinitionQuery,
  GetAgentSessionQuery,
  GetAgentSessionTurnQuery,
  GetTerminalAgentSessionQuery,
  InspectAgentConfigurationQuery,
  ListActiveAgentSessionsQuery,
  ListAgentDefinitionsQuery,
  ListTerminalAgentSessionsQuery,
  SubscribeAgentSessionEventsQuery,
  WaitForAgentSessionTurnQuery,
} from './queries/agent-session.queries.js';

@Injectable()
export class AgentSessionApiService {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  listAgents(data: AgentSessionPageData = {}) {
    return this.execute(() => this.queries.execute(new ListAgentDefinitionsQuery(data)));
  }

  getAgent(agentId: string, agentVersion: string) {
    return this.execute(() =>
      this.queries.execute(new GetAgentDefinitionQuery({ agentId, agentVersion })),
    );
  }

  listActive(data: AgentSessionPageData = {}) {
    return this.execute(() => this.queries.execute(new ListActiveAgentSessionsQuery(data)));
  }

  getTerminal(sessionId: string) {
    return this.execute(() =>
      this.queries.execute(new GetTerminalAgentSessionQuery({ sessionId })),
    );
  }

  listTerminal(data: AgentSessionPageData = {}) {
    return this.execute(() => this.queries.execute(new ListTerminalAgentSessionsQuery(data)));
  }

  inspectTurn(turnId: string) {
    return this.execute(() => this.queries.execute(new GetAgentSessionTurnQuery({ turnId })));
  }

  inspectConfiguration(agentId: string, agentVersion: string) {
    return this.execute(() =>
      this.queries.execute(new InspectAgentConfigurationQuery({ agentId, agentVersion })),
    );
  }

  inspect(sessionId: string) {
    return this.execute(() => this.queries.execute(new GetAgentSessionQuery({ sessionId })));
  }

  open(agentId: string, agentVersion: string, configuration?: AgentConfigurationSelectionData) {
    return this.execute(() =>
      this.commands.execute(
        new OpenAgentSessionCommand({
          agentId,
          agentVersion,
          ...(configuration === undefined ? {} : { configuration }),
        }),
      ),
    );
  }

  send(sessionId: string, prompt: string) {
    return this.execute(() =>
      this.commands.execute(new SendAgentSessionMessageCommand({ sessionId, prompt })),
    );
  }

  startTurn(sessionId: string, prompt: string) {
    return this.execute(() =>
      this.commands.execute(new StartAgentSessionTurnCommand({ sessionId, prompt })),
    );
  }

  waitForTurn(turnId: string) {
    return this.execute(() => this.queries.execute(new WaitForAgentSessionTurnQuery({ turnId })));
  }

  cancelTurn(turnId: string) {
    return this.execute(() => this.commands.execute(new CancelAgentSessionTurnCommand({ turnId })));
  }

  checkpoint(sessionId: string) {
    return this.execute(() =>
      this.commands.execute(new CheckpointAgentSessionCommand({ sessionId })),
    );
  }

  hibernate(sessionId: string) {
    return this.execute(() =>
      this.commands.execute(new HibernateAgentSessionCommand({ sessionId })),
    );
  }

  resume(token: AgentSessionResumeTokenData, configuration?: AgentConfigurationSelectionData) {
    return this.execute(() =>
      this.commands.execute(
        new ResumeAgentSessionCommand({
          token,
          ...(configuration === undefined ? {} : { configuration }),
        }),
      ),
    );
  }

  respond(sessionId: string, response: RespondAgentSessionData) {
    return this.execute(() =>
      this.commands.execute(new RespondAgentSessionCommand({ sessionId, response })),
    );
  }

  cancel(sessionId: string) {
    return this.execute(() => this.commands.execute(new CancelAgentSessionCommand({ sessionId })));
  }

  close(sessionId: string) {
    return this.execute(() => this.commands.execute(new CloseAgentSessionCommand({ sessionId })));
  }

  events(sessionId: string, after?: AgentSessionEventCursorData) {
    return this.execute(() =>
      this.queries.execute(
        new SubscribeAgentSessionEventsQuery({
          sessionId,
          ...(after === undefined ? {} : { after }),
        }),
      ),
    );
  }

  private async execute<T>(operation: () => T | Promise<T>): Promise<Awaited<T>> {
    try {
      return await operation();
    } catch (error) {
      throw mapAgentSessionError(error);
    }
  }
}
