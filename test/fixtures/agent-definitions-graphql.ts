import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import type { AgentManager, AgentSessions } from '@revisium/revo-agent-runtime';
import request from 'supertest';
import { vi } from 'vitest';

import { AgentDefinitionsResolver } from '../../src/api/graphql/agent-definitions/agent-definitions.resolver.js';
import { databaseConfig } from '../../src/config/database.config.js';
import { AgentDefinitionsModule } from '../../src/features/agent-definitions/agent-definitions.module.js';
import { AgentConfigurationCache } from '../../src/features/agent-definitions/configurations/agent-configuration-cache.js';
import {
  AGENT_DEFINITIONS,
  AGENT_LAUNCH_CONTEXT,
  AGENT_MANAGER,
} from '../../src/infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionDirectories } from '../../src/infrastructure/agent-runtime/agent-session-directories.js';

export async function createAgentDefinitionsGraphqlApp() {
  const agent = {
    agent: { id: 'test', version: '1' },
    definitionDigest: 'digest',
    displayName: 'Test agent',
    capabilities: {
      session: {
        multiTurn: true,
        resume: 'native',
        interactions: { permission: true, input: true },
        updates: { message: true, tool: true, usage: true, plan: true, progress: true },
      },
      cancellation: true,
      usage: true,
      structuredResult: true,
    },
  } as const;
  const sessions = {
    listAgents: vi.fn<AgentSessions['listAgents']>().mockReturnValue([agent]),
  };
  const manager = {
    sessions,
    inspectConfiguration: vi.fn<AgentManager['inspectConfiguration']>(),
  };
  const launchContext = { environment: { inherit: [], variables: {}, secrets: {} } };
  const directories = { workspaceDirectory: '/test/workspace' };
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
      AgentDefinitionsModule,
      GraphQLModule.forRoot<YogaDriverConfig>({
        driver: YogaDriver,
        autoSchemaFile: true,
        sortSchema: true,
      }),
    ],
    providers: [AgentDefinitionsResolver],
  })
    .overrideProvider(AGENT_MANAGER)
    .useValue(manager)
    .overrideProvider(AGENT_DEFINITIONS)
    .useValue([])
    .overrideProvider(AGENT_LAUNCH_CONTEXT)
    .useValue(launchContext)
    .overrideProvider(AgentSessionDirectories)
    .useValue(directories)
    .compile();
  const app = module.createNestApplication();
  await app.init();

  return {
    app,
    manager,
    sessions,
    launchContext,
    cache: module.get(AgentConfigurationCache),
    graphql: (query: string, variables: Readonly<Record<string, unknown>> = {}) =>
      request(app.getHttpServer()).post('/graphql').send({ query, variables }),
  };
}
