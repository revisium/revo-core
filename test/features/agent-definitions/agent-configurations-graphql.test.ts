import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import type {
  AgentConfigurationCatalog,
  AgentManager,
  AgentSessions,
} from '@revisium/revo-agent-runtime';
import { afterEach, expect, test, vi } from 'vitest';

import { AgentDefinitionsResolver } from '../../../src/api/graphql/agent-definitions/agent-definitions.resolver.js';
import { GraphqlSubscriptionTransport } from '../../../src/api/graphql/subscriptions/graphql-subscription-transport.js';
import { GraphqlSubscriptionsModule } from '../../../src/api/graphql/subscriptions/graphql-subscriptions.module.js';
import { databaseConfig } from '../../../src/config/database.config.js';
import { AgentDefinitionsModule } from '../../../src/features/agent-definitions/agent-definitions.module.js';
import { AgentConfigurationCache } from '../../../src/features/agent-definitions/configurations/agent-configuration-cache.js';
import {
  AGENT_DEFINITIONS,
  AGENT_LAUNCH_CONTEXT,
  AGENT_MANAGER,
} from '../../../src/infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionDirectories } from '../../../src/infrastructure/agent-runtime/agent-session-directories.js';
import { parseGraphqlSseEvent, type GraphqlSseEvent } from '../../support/graphql-sse-client.js';

const agent = {
  agent: { id: 'test', version: '1' },
  definitionDigest: 'digest',
  displayName: 'Test agent',
  capabilities: {
    cancellation: true,
    structuredResult: true,
    usage: true,
    session: {
      multiTurn: true,
      resume: 'native',
      interactions: { permission: true, input: true },
      updates: { message: true, tool: true, usage: true, plan: true, progress: true },
    },
  },
} as const;

const catalog: AgentConfigurationCatalog = {
  schemaVersion: 'agent-configuration-catalog/v2' as const,
  agent: agent.agent,
  definitionDigest: 'digest',
  catalogRevision: 'catalog_1',
  options: [
    {
      id: 'model',
      name: 'Model',
      type: 'select',
      currentValue: 'provider/ready',
      values: [{ value: 'provider/ready', name: 'Ready' }],
    },
  ],
  launch: { executable: 'test-cli', reportedVersion: '1' },
};

const subscriptionCatalog: AgentConfigurationCatalog = {
  ...catalog,
  model: {
    optionId: 'model',
    currentModel: 'provider/ready',
    currentProvider: { id: 'provider', name: 'Provider' },
    sessionAvailable: [{ value: 'provider/ready', name: 'Ready' }],
    providers: [
      {
        id: 'provider',
        name: 'Provider',
        connected: true,
        models: [
          { value: 'provider/ready', name: 'Ready', connected: true },
          { value: 'provider/hidden', name: 'Hidden', connected: false },
        ],
      },
      {
        id: 'offline',
        name: 'Offline',
        connected: false,
        models: [{ value: 'offline/model', name: 'Offline model', connected: true }],
      },
    ],
  },
};

type CatalogView = {
  readonly catalogRevision: string;
  readonly options: readonly unknown[];
  readonly model?: {
    readonly currentModel: string;
    readonly currentProvider?: { readonly id: string };
    readonly sessionAvailable: readonly unknown[];
    readonly providers: readonly unknown[];
  };
};

async function createApp() {
  const sessions = { listAgents: vi.fn<AgentSessions['listAgents']>().mockReturnValue([agent]) };
  const manager = {
    sessions,
    inspectConfiguration: vi.fn<AgentManager['inspectConfiguration']>(() => new Promise(() => {})),
  };
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
      AgentDefinitionsModule,
      GraphQLModule.forRootAsync<YogaDriverConfig>({
        driver: YogaDriver,
        imports: [GraphqlSubscriptionsModule],
        inject: [GraphqlSubscriptionTransport],
        useFactory: (transport: GraphqlSubscriptionTransport) => ({
          autoSchemaFile: true,
          path: '/graphql',
          plugins: transport.plugins,
        }),
      }),
    ],
    providers: [AgentDefinitionsResolver],
  })
    .overrideProvider(AGENT_MANAGER)
    .useValue(manager)
    .overrideProvider(AGENT_DEFINITIONS)
    .useValue([])
    .overrideProvider(AGENT_LAUNCH_CONTEXT)
    .useValue({ environment: { inherit: [], variables: {}, secrets: {} } })
    .overrideProvider(AgentSessionDirectories)
    .useValue({ workspaceDirectory: '/test/workspace' })
    .compile();
  const app = module.createNestApplication();
  await app.listen(0, '127.0.0.1');

  return {
    app,
    cache: app.get(AgentConfigurationCache),
    endpoint: `${await app.getUrl()}/graphql/stream`,
  };
}

function nextDataEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): () => Promise<GraphqlSseEvent> {
  const decoder = new TextDecoder();
  let buffer = '';

  const read = async (): Promise<GraphqlSseEvent> => {
    const separator = buffer.indexOf('\n\n');

    if (separator >= 0) {
      const block = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      const event = parseGraphqlSseEvent(block);

      if (event?.data !== undefined) {
        return event;
      }

      return read();
    }

    const result = await reader.read();

    if (result.done) {
      throw new Error('GraphQL subscription ended before the expected snapshot.');
    }

    buffer += decoder.decode(result.value, { stream: true }).replaceAll('\r\n', '\n');

    return read();
  };

  return read;
}

type ConfigurationSnapshot = {
  readonly status: string;
  readonly catalogs: readonly {
    readonly catalogRevision: string;
    readonly model?: {
      readonly providers: readonly {
        readonly id: string;
        readonly connected: boolean;
        readonly models: readonly { readonly value: string; readonly connected: boolean }[];
      }[];
    };
  }[];
};

function configurationSnapshot(event: GraphqlSseEvent): ConfigurationSnapshot {
  return (event.data as { data: { agentConfigurations: ConfigurationSnapshot } }).data
    .agentConfigurations;
}

let app: Awaited<ReturnType<typeof createApp>>['app'] | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const subscriptionQuery = `subscription {
  agentConfigurations {
    status
    catalogs {
      catalogRevision
      model { providers { id connected models { value connected } } }
    }
  }
}`;

test('streams loading then connected ready configuration snapshots', async () => {
  const fixture = await createApp();
  app = fixture.app;
  const controller = new AbortController();
  const response = await fetch(fixture.endpoint, {
    method: 'POST',
    headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: subscriptionQuery }),
    signal: controller.signal,
  });
  const reader = response.body?.getReader();
  if (reader === undefined) {
    throw new Error('GraphQL subscription response has no body.');
  }

  const readDataEvent = nextDataEvent(reader);
  const loading = await readDataEvent();
  expect(configurationSnapshot(loading).status).toBe('LOADING');

  fixture.cache.publish([subscriptionCatalog]);
  const ready = await readDataEvent();
  const readySnapshot = configurationSnapshot(ready);
  expect(readySnapshot.status).toBe('READY');
  expect(readySnapshot.catalogs[0]?.catalogRevision).toBe('catalog_1');
  expect(readySnapshot.catalogs[0]?.model?.providers).toEqual([
    {
      id: 'provider',
      connected: true,
      models: [{ value: 'provider/ready', connected: true }],
    },
  ]);
  controller.abort();
});

test('sends the latest ready snapshot to a fresh subscription', async () => {
  const fixture = await createApp();
  app = fixture.app;
  fixture.cache.publish([subscriptionCatalog]);
  const reconnect = await fetch(fixture.endpoint, {
    method: 'POST',
    headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: subscriptionQuery }),
  });
  const reconnectReader = reconnect.body?.getReader();
  if (reconnectReader === undefined) {
    throw new Error('GraphQL reconnect response has no body.');
  }

  const readReconnectDataEvent = nextDataEvent(reconnectReader);
  const latest = await readReconnectDataEvent();
  const latestSnapshot = configurationSnapshot(latest);
  expect(latestSnapshot.status).toBe('READY');
  expect(latestSnapshot.catalogs[0]?.catalogRevision).toBe('catalog_1');
  await reconnectReader?.cancel();
});

test('returns connected projection separately from the full catalog snapshot', async () => {
  const fixture = await createApp();
  app = fixture.app;
  const fullCatalog: AgentConfigurationCatalog = {
    ...catalog,
    model: {
      optionId: 'model',
      currentModel: 'provider/ready',
      currentProvider: { id: 'provider', name: 'Provider' },
      sessionAvailable: [{ value: 'provider/ready', name: 'Ready' }],
      providers: [
        {
          id: 'provider',
          name: 'Provider',
          connected: true,
          models: [
            { value: 'provider/ready', name: 'Ready', connected: true },
            { value: 'provider/hidden', name: 'Hidden', connected: false },
          ],
        },
        {
          id: 'offline',
          name: 'Offline',
          connected: false,
          models: [{ value: 'offline/model', name: 'Offline model', connected: true }],
        },
      ],
    },
  };
  fixture.cache.publish([fullCatalog]);

  const response = await fetch(`${await fixture.app.getUrl()}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query {
        agentConfigurations {
          catalogs {
            catalogRevision options { __typename ... on AgentConfigurationSelectModel { values { value } } }
            model { currentModel currentProvider { id } sessionAvailable { value } providers { id connected models { value connected } } }
          }
        }
        allAgentConfigurations {
          catalogs {
            catalogRevision options { __typename ... on AgentConfigurationSelectModel { values { value } } }
            model { currentModel currentProvider { id } sessionAvailable { value } providers { id connected models { value connected } } }
          }
        }
      }`,
    }),
  });
  const payload = (await response.json()) as {
    data: {
      agentConfigurations: { catalogs: readonly CatalogView[] };
      allAgentConfigurations: { catalogs: readonly CatalogView[] };
    };
  };
  expect(payload.data.agentConfigurations.catalogs[0]?.model?.providers).toHaveLength(1);
  expect(payload.data.allAgentConfigurations.catalogs[0]?.model?.providers).toHaveLength(2);
  expect(payload.data.agentConfigurations.catalogs[0]).toMatchObject({
    catalogRevision: 'catalog_1',
    options: [
      { __typename: 'AgentConfigurationSelectModel', values: [{ value: 'provider/ready' }] },
    ],
    model: {
      currentModel: 'provider/ready',
      currentProvider: { id: 'provider' },
      sessionAvailable: [{ value: 'provider/ready' }],
    },
  });
  expect(payload.data.allAgentConfigurations.catalogs[0]).toMatchObject({
    catalogRevision: 'catalog_1',
    model: { sessionAvailable: [{ value: 'provider/ready' }] },
  });
});
