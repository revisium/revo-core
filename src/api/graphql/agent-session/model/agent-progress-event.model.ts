import { Field, ID, ObjectType } from '@nestjs/graphql';

import { AgentSessionEventModel } from './agent-session-event.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class AgentProgressEventModel extends AgentSessionEventModel {
  @Field(() => ID)
  turnId: string;

  @Field(() => String)
  message: string;
}
