import { Field, ObjectType } from '@nestjs/graphql';

import { AgentMessageModel } from './agent-message.model.js';
import { AgentUsageModel } from './agent-usage.model.js';

@ObjectType()
export class AgentCompletedTurnModel {
  @Field(() => String)
  status: string;

  @Field(() => AgentMessageModel)
  message: AgentMessageModel;

  @Field(() => AgentUsageModel, { nullable: true })
  usage?: AgentUsageModel;
}
