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
    external: ['dbos.operation_outputs', 'dbos.workflow_status'],
  },
});
