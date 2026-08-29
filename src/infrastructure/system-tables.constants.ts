import type { SystemTablesService } from '@revisium/engine';

type EngineSystemTableId = Parameters<SystemTablesService['ensureSystemTable']>[1];
export type SystemTableValue = `${EngineSystemTableId}`;

export const SYSTEM_TABLE_IDS = [
  'revisium_schema_table',
  'revisium_shared_schemas_table',
  'revisium_migration_table',
  'revisium_views_table',
] as const satisfies readonly SystemTableValue[];
