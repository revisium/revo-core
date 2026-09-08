import { config as loadEnvironment } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

loadEnvironment();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
  experimental: {
    externalTables: true,
  },
  tables: {
    // All tables owned by the installed DBOS 4.25.x migrations, not only
    // the two models queried by Prisma Client. Keep this list in sync on DBOS upgrades.
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
