import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentInterruptedTurnModel {
  @Field(() => String)
  status: string;
}
