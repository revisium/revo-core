import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentCancelledTurnModel {
  @Field(() => String)
  status: string;
}
