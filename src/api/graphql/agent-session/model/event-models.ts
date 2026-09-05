import { AgentProgressEventModel } from './agent-progress-event.model.js';
import { AssistantMessageCompletedEventModel } from './assistant-message-completed-event.model.js';
import { AssistantMessageDeltaEventModel } from './assistant-message-delta-event.model.js';
import { InteractionRequestedEventModel } from './interaction-requested-event.model.js';
import { InteractionResolvedEventModel } from './interaction-resolved-event.model.js';
import { PlanUpdatedEventModel } from './plan-updated-event.model.js';
import { SessionAcceptedEventModel } from './session-accepted-event.model.js';
import { SessionCheckpointedEventModel } from './session-checkpointed-event.model.js';
import { SessionClosedEventModel } from './session-closed-event.model.js';
import { SessionHibernatedEventModel } from './session-hibernated-event.model.js';
import { SessionOpenedEventModel } from './session-opened-event.model.js';
import { ToolActivityEventModel } from './tool-activity-event.model.js';
import { TurnCompletedEventModel } from './turn-completed-event.model.js';
import { TurnStartedEventModel } from './turn-started-event.model.js';
import { UsageUpdatedEventModel } from './usage-updated-event.model.js';

export const eventModels = {
  'session.accepted': SessionAcceptedEventModel,
  'session.opened': SessionOpenedEventModel,
  'turn.started': TurnStartedEventModel,
  'assistant.message.delta': AssistantMessageDeltaEventModel,
  'assistant.message.completed': AssistantMessageCompletedEventModel,
  'agent.progress': AgentProgressEventModel,
  'tool.activity': ToolActivityEventModel,
  'plan.updated': PlanUpdatedEventModel,
  'interaction.requested': InteractionRequestedEventModel,
  'interaction.resolved': InteractionResolvedEventModel,
  'usage.updated': UsageUpdatedEventModel,
  'session.checkpointed': SessionCheckpointedEventModel,
  'turn.completed': TurnCompletedEventModel,
  'session.hibernated': SessionHibernatedEventModel,
  'session.closed': SessionClosedEventModel,
};
