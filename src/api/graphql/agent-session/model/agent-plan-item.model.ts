import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentPlanItemModel {
  @Field(() => String)
  itemId: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  status: string;
}
