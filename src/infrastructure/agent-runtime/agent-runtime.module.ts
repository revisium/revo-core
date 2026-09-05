import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import {
  createAgentManager,
  discoverAgents,
  type AgentDefinitionInput,
  type AgentManager,
  type AgentStartContext,
} from '@revisium/revo-agent-runtime';

import { agentRuntimeConfig } from '../../config/agent-runtime.config.js';
import { AgentActiveState } from './agent-active-state.js';
import { AgentRuntimeLifecycle } from './agent-runtime-lifecycle.js';
import { AGENT_DEFINITIONS, AGENT_LAUNCH_CONTEXT, AGENT_MANAGER } from './agent-runtime.tokens.js';
import { AgentSessionDirectories } from './agent-session-directories.js';
import { AgentSessionEventJournal } from './agent-session-event-journal.js';

@Module({
  imports: [ConfigModule.forFeature(agentRuntimeConfig)],
  providers: [
    AgentActiveState,
    AgentSessionDirectories,
    AgentSessionEventJournal,
    AgentRuntimeLifecycle,
    {
      provide: AGENT_DEFINITIONS,
      useFactory: async () => (await discoverAgents()).definitions,
    },
    {
      provide: AGENT_LAUNCH_CONTEXT,
      inject: [agentRuntimeConfig.KEY],
      useFactory: (config: ConfigType<typeof agentRuntimeConfig>): AgentStartContext => ({
        environment: {
          inherit: config.inheritedEnvironmentNames,
          variables: {},
          secrets: {},
        },
      }),
    },
    {
      provide: AGENT_MANAGER,
      inject: [
        AGENT_DEFINITIONS,
        AgentActiveState,
        AgentSessionEventJournal,
        AgentSessionDirectories,
      ],
      useFactory: async (
        definitions: readonly AgentDefinitionInput[],
        state: AgentActiveState,
        journal: AgentSessionEventJournal,
        directories: AgentSessionDirectories,
      ) => {
        await directories.initialize();
        let manager: AgentManager | undefined;

        try {
          manager = createAgentManager({
            definitions,
            activeStateSink: state.invocationSink,
            sessions: { activeStateSink: state.sessionSink, eventSink: journal.sink },
          });
          await manager.initialize({ invocations: [], sessions: [] });

          return manager;
        } catch (error) {
          await manager?.shutdown('revo_core_initialization_failed');
          await directories.cleanup();
          throw error;
        }
      },
    },
  ],
  exports: [
    AGENT_MANAGER,
    AGENT_DEFINITIONS,
    AGENT_LAUNCH_CONTEXT,
    AgentRuntimeLifecycle,
    AgentSessionDirectories,
    AgentSessionEventJournal,
  ],
})
export class AgentRuntimeModule {}
