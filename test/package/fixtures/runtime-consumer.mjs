import assert from 'node:assert/strict';
import { join } from 'node:path';

import { createRevoCoreRuntime } from '@revisium/revo-core/runtime';

const databaseUrl = process.env.REVO_CORE_CONSUMER_DATABASE_URL;
const runtimeRoot = process.env.REVO_CORE_CONSUMER_RUNTIME_ROOT;
if (databaseUrl === undefined || runtimeRoot === undefined) {
  throw new Error('The packed consumer requires its database and runtime root.');
}
assert.equal(process.env.DATABASE_URL, undefined);

const runtime = await createRevoCoreRuntime({
  databaseUrl,
  logger: false,
  temporaryWorkingDirectoryRoot: join(runtimeRoot, 'work'),
  agentWorkspaceDirectory: join(runtimeRoot, 'agents'),
});
assert.equal(process.env.DATABASE_URL, undefined);

try {
  const listening = await runtime.listen({ host: '127.0.0.1', port: 0 });
  const rest = await fetch(`${listening.url}/api/system`);
  assert.equal(rest.status, 200);
  assert.deepEqual(await rest.json(), { name: 'revo-core', status: 'ok' });

  const graphql = await fetch(`${listening.url}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'query { systemInfo { name status } }' }),
  });
  assert.equal(graphql.status, 200);
  assert.deepEqual(await graphql.json(), {
    data: { systemInfo: { name: 'revo-core', status: 'ok' } },
  });

  const internalModule = '@revisium/revo-core/app.module';
  await assert.rejects(
    import(internalModule),
    (error) => error instanceof Error && error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  );
} finally {
  await runtime.close();
}
