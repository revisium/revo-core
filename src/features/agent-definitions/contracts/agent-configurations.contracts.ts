import type { AgentConfigurationCatalog } from '@revisium/revo-agent-runtime';

export enum AgentConfigurationsStatus {
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  LOADING = 'LOADING',
  READY = 'READY',
}

export interface AgentConfigurationsSnapshot {
  readonly status: AgentConfigurationsStatus;
  readonly catalogs: readonly AgentConfigurationCatalog[];
}
