import { createUnionType } from '@nestjs/graphql';

import { AgentCancelledTurnModel } from './agent-cancelled-turn.model.js';
import { AgentCompletedTurnModel } from './agent-completed-turn.model.js';
import { AgentFailedTurnModel } from './agent-failed-turn.model.js';
import { AgentInterruptedTurnModel } from './agent-interrupted-turn.model.js';
import { AgentTimedOutTurnModel } from './agent-timed-out-turn.model.js';
import { turnModels } from './turn-models.js';

export const AgentSessionTurnResultModel = createUnionType({
  name: 'AgentSessionTurnResult',
  types: () =>
    [
      AgentCompletedTurnModel,
      AgentCancelledTurnModel,
      AgentTimedOutTurnModel,
      AgentInterruptedTurnModel,
      AgentFailedTurnModel,
    ] as const,
  resolveType: (value: { status: keyof typeof turnModels }) => turnModels[value.status],
});
