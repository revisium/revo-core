import { Field, ID, Int, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
export abstract class AgentSessionEventModel {
  @Field(() => String)
  schemaVersion: string;
  @Field(() => ID)
  sessionId: string;
  @Field(() => String)
  streamId: string;
  @Field(() => Int)
  sequence: number;
  @Field(() => ID)
  eventId: string;
  @Field(() => String)
  observedAt: string;
  @Field(() => String)
  type: string;
}
