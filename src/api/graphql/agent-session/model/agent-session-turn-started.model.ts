import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentSessionTurnStartedModel {
  @Field(() => ID)
  sessionId: string;

  @Field(() => ID)
  turnId: string;
}
