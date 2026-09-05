import { Field, ID, ObjectType } from '@nestjs/graphql';

import { AgentSessionEventModel } from './agent-session-event.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class ToolActivityEventModel extends AgentSessionEventModel {
  @Field(() => ID)
  turnId: string;

  @Field(() => String)
  toolCallId: string;

  @Field(() => String)
  kind: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  status: string;
}
