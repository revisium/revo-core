import { Field, ID, ObjectType } from '@nestjs/graphql';

import { AgentSessionTurnResultModel } from './agent-session-turn-result.model.js';

@ObjectType()
export class AgentSessionTurnModel {
  @Field(() => ID)
  sessionId: string;

  @Field(() => ID)
  turnId: string;

  @Field(() => String)
  state: string;

  @Field(() => AgentSessionTurnResultModel, { nullable: true })
  result?: typeof AgentSessionTurnResultModel;
}
