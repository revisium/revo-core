import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentMessageModel {
  @Field(() => String)
  role: string;

  @Field(() => String)
  content: string;
}
