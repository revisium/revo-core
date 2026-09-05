import { Field, ObjectType } from '@nestjs/graphql';

import { AgentSelectOptionModel } from './agent-select-option.model.js';

@ObjectType()
export class AgentSelectQuestionModel {
  @Field(() => String)
  questionId: string;

  @Field(() => String)
  title: string;

  @Field(() => Boolean)
  required: boolean;

  @Field(() => String)
  input: string;

  @Field(() => String)
  selection: string;

  @Field(() => Boolean)
  allowOther: boolean;

  @Field(() => [AgentSelectOptionModel])
  options: readonly AgentSelectOptionModel[];
}
