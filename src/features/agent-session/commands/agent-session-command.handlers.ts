import { CancelAgentSessionTurnHandler } from './handlers/cancel-agent-session-turn.handler.js';
import { CancelAgentSessionHandler } from './handlers/cancel-agent-session.handler.js';
import { CheckpointAgentSessionHandler } from './handlers/checkpoint-agent-session.handler.js';
import { CloseAgentSessionHandler } from './handlers/close-agent-session.handler.js';
import { HibernateAgentSessionHandler } from './handlers/hibernate-agent-session.handler.js';
import { OpenAgentSessionHandler } from './handlers/open-agent-session.handler.js';
import { RespondAgentSessionHandler } from './handlers/respond-agent-session.handler.js';
import { ResumeAgentSessionHandler } from './handlers/resume-agent-session.handler.js';
import { SendAgentSessionMessageHandler } from './handlers/send-agent-session-message.handler.js';
import { StartAgentSessionTurnHandler } from './handlers/start-agent-session-turn.handler.js';

export const AGENT_SESSION_COMMAND_HANDLERS = [
  OpenAgentSessionHandler,
  SendAgentSessionMessageHandler,
  StartAgentSessionTurnHandler,
  CancelAgentSessionTurnHandler,
  CheckpointAgentSessionHandler,
  HibernateAgentSessionHandler,
  ResumeAgentSessionHandler,
  RespondAgentSessionHandler,
  CancelAgentSessionHandler,
  CloseAgentSessionHandler,
] as const;
