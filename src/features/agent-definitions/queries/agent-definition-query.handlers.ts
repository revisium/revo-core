import { GetAgentDefinitionHandler } from './handlers/get-agent-definition.handler.js';
import { InspectAgentConfigurationHandler } from './handlers/inspect-agent-configuration.handler.js';
import { ListAgentDefinitionsHandler } from './handlers/list-agent-definitions.handler.js';

export const AGENT_DEFINITION_QUERY_HANDLERS = [
  ListAgentDefinitionsHandler,
  GetAgentDefinitionHandler,
  InspectAgentConfigurationHandler,
] as const;
