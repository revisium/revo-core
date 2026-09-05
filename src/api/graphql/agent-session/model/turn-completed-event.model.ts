import { Field, ID, ObjectType } from '@nestjs/graphql';

import { AgentSessionEventModel } from './agent-session-event.model.js';
import { AgentTurnOutcomeModel } from './agent-turn-outcome.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class TurnCompletedEventModel extends AgentSessionEventModel {
  @Field(() => ID)
  turnId: string;

  @Field(() => AgentTurnOutcomeModel)
  outcome: AgentTurnOutcomeModel;
}
