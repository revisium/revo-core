import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentNumberQuestionModel {
  @Field(() => String)
  questionId: string;

  @Field(() => String)
  title: string;

  @Field(() => Boolean)
  required: boolean;

  @Field(() => String)
  input: string;

  @Field(() => Boolean)
  integer: boolean;

  @Field(() => Number, { nullable: true })
  minimum?: number;

  @Field(() => Number, { nullable: true })
  maximum?: number;
}
