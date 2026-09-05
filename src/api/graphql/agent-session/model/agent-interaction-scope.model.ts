import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentInteractionScopeModel {
  @Field(() => String)
  kind: string;

  @Field(() => ID, { nullable: true })
  turnId?: string;
}
