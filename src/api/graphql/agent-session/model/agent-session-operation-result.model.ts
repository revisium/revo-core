import { Field, ObjectType } from '@nestjs/graphql';

import { AgentSessionTurnResultModel } from './agent-session-turn-result.model.js';

@ObjectType()
export class AgentSessionOperationResultModel {
  @Field(() => String)
  state: string;

  @Field(() => AgentSessionTurnResultModel, { nullable: true })
  result?: typeof AgentSessionTurnResultModel;
}
