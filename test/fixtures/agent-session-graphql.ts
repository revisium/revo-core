import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import type {
  AgentManager,
  AgentSession,
  AgentSessionResumeToken,
  AgentSessions,
} from '@revisium/revo-agent-runtime';
import request from 'supertest';
import { vi } from 'vitest';

import { AgentSessionResolver } from '../../src/api/graphql/agent-session/agent-session.resolver.js';
import { AgentSessionModule } from '../../src/features/agent-session/agent-session.module.js';
import {
  AGENT_DEFINITIONS,
  AGENT_LAUNCH_CONTEXT,
  AGENT_MANAGER,
} from '../../src/infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionDirectories } from '../../src/infrastructure/agent-runtime/agent-session-directories.js';

export const sessionPin = { agentId: 'test', agentVersion: '1', definitionDigest: 'digest' };
export const sessionCapabilities: AgentSession['capabilities'] = {
  multiTurn: true,
  resume: 'native',
  interactions: { permission: true, input: true },
  updates: { message: true, tool: true, usage: true, plan: true, progress: false },
};

export const sessionResumeToken: AgentSessionResumeToken = {
  schemaVersion: 'agent-session-resume-token/v1',
  sessionId: 'dlg_test',
  resumeTokenId: 'resume_test',
  eligibility: 'hibernated',
  pin: sessionPin,
  cursor: { streamId: 'stream_test', sequence: 5, eventId: 'event_test' },
  payload: 'opaque-provider-continuation',
  sha256: 'digest',
};

export async function createAgentSessionGraphqlApp() {
  const session = {
    sessionId: 'dlg_test',
    pin: sessionPin,
    capabilities: sessionCapabilities,
    send: vi.fn<AgentSession['send']>(),
    respond: vi.fn<AgentSession['respond']>(),
    checkpoint: vi.fn<AgentSession['checkpoint']>(),
    hibernate: vi.fn<AgentSession['hibernate']>(),
    close: vi.fn<AgentSession['close']>().mockResolvedValue({ state: 'closed' }),
    cancel: vi.fn<AgentSession['cancel']>(),
  } satisfies AgentSession;
  const sessions = {
    listAgents: vi.fn<AgentSessions['listAgents']>().mockReturnValue([]),
    open: vi.fn<AgentSessions['open']>().mockResolvedValue(session),
    resume: vi.fn<AgentSessions['resume']>().mockResolvedValue(session),
    get: vi.fn<AgentSessions['get']>().mockReturnValue(session),
    inspect: vi.fn<AgentSessions['inspect']>(),
    list: vi.fn<AgentSessions['list']>().mockReturnValue([]),
    getTerminal: vi.fn<AgentSessions['getTerminal']>(),
    listTerminal: vi.fn<AgentSessions['listTerminal']>().mockReturnValue([]),
    respond: vi.fn<AgentSessions['respond']>(),
    cancel: vi.fn<AgentSessions['cancel']>().mockResolvedValue({ state: 'requested' }),
  } satisfies AgentSessions;
  const manager = {
    sessions,
    inspectConfiguration: vi.fn<AgentManager['inspectConfiguration']>(),
  } satisfies Pick<AgentManager, 'sessions' | 'inspectConfiguration'>;
  const launchContext = { environment: { inherit: [], variables: {}, secrets: {} } };
  const directories = {
    workspaceDirectory: '/test/workspace',
    outputDirectory: vi
      .fn<AgentSessionDirectories['outputDirectory']>()
      .mockReturnValue('/test/output'),
  };
  const module = await Test.createTestingModule({
    imports: [
      AgentSessionModule,
      GraphQLModule.forRoot<YogaDriverConfig>({
        driver: YogaDriver,
        autoSchemaFile: true,
        sortSchema: true,
      }),
    ],
    providers: [AgentSessionResolver],
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
    session,
    sessions,
    directories,
    launchContext,
    graphql: (query: string, variables: Record<string, unknown> = {}) =>
      request(app.getHttpServer()).post('/graphql').send({ query, variables }),
  };
}
