import { GetAgentConfigurationsHandler } from './handlers/get-agent-configurations.handler.js';
import { GetAgentDefinitionHandler } from './handlers/get-agent-definition.handler.js';
import { InspectAgentConfigurationHandler } from './handlers/inspect-agent-configuration.handler.js';
import { ListAgentDefinitionsHandler } from './handlers/list-agent-definitions.handler.js';
import { WatchAgentConfigurationsHandler } from './handlers/watch-agent-configurations.handler.js';

export const AGENT_DEFINITION_QUERY_HANDLERS = [
  GetAgentConfigurationsHandler,
  WatchAgentConfigurationsHandler,
  ListAgentDefinitionsHandler,
  GetAgentDefinitionHandler,
  InspectAgentConfigurationHandler,
] as const;
