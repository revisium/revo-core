import { Field, ObjectType } from '@nestjs/graphql';

import { AgentSessionEventModel } from './agent-session-event.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class SessionCheckpointedEventModel extends AgentSessionEventModel {
  @Field(() => String)
  checkpointId: string;

  @Field(() => String)
  checkpointSha256: string;
}
