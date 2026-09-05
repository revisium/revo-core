import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AgentRuntimeModule } from '../../infrastructure/agent-runtime/agent-runtime.module.js';
import { AgentSessionApiService } from './agent-session-api.service.js';
import { AGENT_SESSION_COMMAND_HANDLERS } from './commands/agent-session-command.handlers.js';
import { AGENT_SESSION_QUERY_HANDLERS } from './queries/agent-session-query.handlers.js';
import { AgentSessionTurnRegistry } from './turns/agent-session-turn-registry.js';

@Module({
  imports: [CqrsModule, AgentRuntimeModule],
  providers: [
    AgentSessionTurnRegistry,
    AgentSessionApiService,
    ...AGENT_SESSION_COMMAND_HANDLERS,
    ...AGENT_SESSION_QUERY_HANDLERS,
  ],
  exports: [AgentSessionApiService],
})
export class AgentSessionModule {}
