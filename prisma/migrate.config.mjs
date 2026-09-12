import { fileURLToPath } from 'node:url';

import { defineConfig, env } from 'prisma/config';

const fromHere = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  schema: fromHere('./schema.prisma'),
  migrations: { path: fromHere('./migrations') },
  datasource: { url: env('DATABASE_URL') },
  experimental: { externalTables: true },
  tables: {
    external: [
      'dbos.application_versions',
      'dbos.dbos_migrations',
      'dbos.event_dispatch_kv',
      'dbos.notifications',
      'dbos.operation_outputs',
      'dbos.queues',
      'dbos.scheduler_state',
      'dbos.streams',
      'dbos.workflow_events',
      'dbos.workflow_events_history',
      'dbos.workflow_inputs',
      'dbos.workflow_queue',
      'dbos.workflow_schedules',
      'dbos.workflow_status',
    ],
  },
});
