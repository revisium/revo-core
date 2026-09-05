import { createUnionType } from '@nestjs/graphql';

import { AgentProgressEventModel } from './agent-progress-event.model.js';
import { AssistantMessageCompletedEventModel } from './assistant-message-completed-event.model.js';
import { AssistantMessageDeltaEventModel } from './assistant-message-delta-event.model.js';
import { eventModels } from './event-models.js';
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

export const AgentSessionEventUnion = createUnionType({
  name: 'AgentSessionEvent',
  types: () =>
    [
      SessionAcceptedEventModel,
      SessionOpenedEventModel,
      TurnStartedEventModel,
      AssistantMessageDeltaEventModel,
      AssistantMessageCompletedEventModel,
      AgentProgressEventModel,
      ToolActivityEventModel,
      PlanUpdatedEventModel,
      InteractionRequestedEventModel,
      InteractionResolvedEventModel,
      UsageUpdatedEventModel,
      SessionCheckpointedEventModel,
      TurnCompletedEventModel,
      SessionHibernatedEventModel,
      SessionClosedEventModel,
    ] as const,
  resolveType: (value: { type: keyof typeof eventModels }) => eventModels[value.type],
});
