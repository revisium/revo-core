import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentUsageModel {
  @Field(() => String)
  scope: string;

  @Field(() => Number, { nullable: true })
  inputTokens?: number;

  @Field(() => Number, { nullable: true })
  outputTokens?: number;

  @Field(() => Number, { nullable: true })
  totalTokens?: number;
}
