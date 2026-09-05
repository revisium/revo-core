import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentRefModel {
  @Field(() => String)
  id: string;

  @Field(() => String)
  version: string;
}
