import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentSessionEventCursorModel {
  @Field(() => String)
  streamId: string;

  @Field(() => Int)
  sequence: number;

  @Field(() => ID)
  eventId: string;
}
