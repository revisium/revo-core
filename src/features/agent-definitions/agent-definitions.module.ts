import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AgentRuntimeModule } from '../../infrastructure/agent-runtime/agent-runtime.module.js';
import { AgentDefinitionsApiService } from './agent-definitions-api.service.js';
import { AGENT_DEFINITION_QUERY_HANDLERS } from './queries/agent-definition-query.handlers.js';

@Module({
  imports: [CqrsModule, AgentRuntimeModule],
  providers: [AgentDefinitionsApiService, ...AGENT_DEFINITION_QUERY_HANDLERS],
  exports: [AgentDefinitionsApiService],
})
export class AgentDefinitionsModule {}
