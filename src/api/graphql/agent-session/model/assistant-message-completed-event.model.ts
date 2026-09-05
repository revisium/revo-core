import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

import { AgentSessionEventModel } from './agent-session-event.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class AssistantMessageCompletedEventModel extends AgentSessionEventModel {
  @Field(() => ID)
  turnId: string;

  @Field(() => String)
  role: string;

  @Field(() => Int)
  contentBytes: number;

  @Field(() => String)
  contentSha256: string;
}
