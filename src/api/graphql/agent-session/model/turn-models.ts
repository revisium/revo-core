import { AgentCancelledTurnModel } from './agent-cancelled-turn.model.js';
import { AgentCompletedTurnModel } from './agent-completed-turn.model.js';
import { AgentFailedTurnModel } from './agent-failed-turn.model.js';
import { AgentInterruptedTurnModel } from './agent-interrupted-turn.model.js';
import { AgentTimedOutTurnModel } from './agent-timed-out-turn.model.js';

export const turnModels = {
  completed: AgentCompletedTurnModel,
  cancelled: AgentCancelledTurnModel,
  timed_out: AgentTimedOutTurnModel,
  interrupted: AgentInterruptedTurnModel,
  failed: AgentFailedTurnModel,
};
