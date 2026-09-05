import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentTextQuestionModel {
  @Field(() => String)
  questionId: string;

  @Field(() => String)
  title: string;

  @Field(() => Boolean)
  required: boolean;

  @Field(() => String)
  input: string;

  @Field(() => Boolean)
  multiline: boolean;

  @Field(() => Int, { nullable: true })
  minLength?: number;

  @Field(() => Int)
  maxLength: number;
}
