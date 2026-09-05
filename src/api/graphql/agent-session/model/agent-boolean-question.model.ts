import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentBooleanQuestionModel {
  @Field(() => String)
  questionId: string;

  @Field(() => String)
  title: string;

  @Field(() => Boolean)
  required: boolean;

  @Field(() => String)
  input: string;
}
