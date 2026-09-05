import { Field, ObjectType } from '@nestjs/graphql';

import { AgentFaultModel } from './agent-fault.model.js';
import { AgentSessionEventModel } from './agent-session-event.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class SessionClosedEventModel extends AgentSessionEventModel {
  @Field(() => String)
  outcome: string;

  @Field(() => AgentFaultModel, { nullable: true })
  error?: AgentFaultModel;
}
