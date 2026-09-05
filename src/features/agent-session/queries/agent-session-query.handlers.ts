import { GetAgentDefinitionHandler } from './handlers/get-agent-definition.handler.js';
import { GetAgentSessionTurnHandler } from './handlers/get-agent-session-turn.handler.js';
import { GetAgentSessionHandler } from './handlers/get-agent-session.handler.js';
import { GetTerminalAgentSessionHandler } from './handlers/get-terminal-agent-session.handler.js';
import { InspectAgentConfigurationHandler } from './handlers/inspect-agent-configuration.handler.js';
import { ListActiveAgentSessionsHandler } from './handlers/list-active-agent-sessions.handler.js';
import { ListAgentDefinitionsHandler } from './handlers/list-agent-definitions.handler.js';
import { ListTerminalAgentSessionsHandler } from './handlers/list-terminal-agent-sessions.handler.js';
import { SubscribeAgentSessionEventsHandler } from './handlers/subscribe-agent-session-events.handler.js';
import { WaitForAgentSessionTurnHandler } from './handlers/wait-for-agent-session-turn.handler.js';

export const AGENT_SESSION_QUERY_HANDLERS = [
  ListAgentDefinitionsHandler,
  GetAgentDefinitionHandler,
  InspectAgentConfigurationHandler,
  GetAgentSessionHandler,
  ListActiveAgentSessionsHandler,
  GetTerminalAgentSessionHandler,
  ListTerminalAgentSessionsHandler,
  GetAgentSessionTurnHandler,
  WaitForAgentSessionTurnHandler,
  SubscribeAgentSessionEventsHandler,
] as const;
