import { Field, ObjectType } from '@nestjs/graphql';

import { AgentFaultModel } from './agent-fault.model.js';

@ObjectType()
export class AgentFailedTurnModel {
  @Field(() => String)
  status: string;

  @Field(() => AgentFaultModel)
  error: AgentFaultModel;
}
