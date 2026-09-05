import { Field, ObjectType } from '@nestjs/graphql';

import { AgentFaultModel } from './agent-fault.model.js';
import { AgentUsageModel } from './agent-usage.model.js';

@ObjectType()
export class AgentTurnOutcomeModel {
  @Field(() => String)
  status: string;

  @Field(() => AgentUsageModel, { nullable: true })
  usage?: AgentUsageModel;

  @Field(() => AgentFaultModel, { nullable: true })
  error?: AgentFaultModel;
}
