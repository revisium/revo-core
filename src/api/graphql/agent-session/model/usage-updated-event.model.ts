import { Field, ID, ObjectType } from '@nestjs/graphql';

import { AgentSessionEventModel } from './agent-session-event.model.js';
import { AgentUsageModel } from './agent-usage.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class UsageUpdatedEventModel extends AgentSessionEventModel {
  @Field(() => ID)
  turnId: string;

  @Field(() => AgentUsageModel)
  usage: AgentUsageModel;
}
