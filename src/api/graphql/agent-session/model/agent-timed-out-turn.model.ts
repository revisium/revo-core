import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentTimedOutTurnModel {
  @Field(() => String)
  status: string;
}
