import { Field, ObjectType } from '@nestjs/graphql';

import { AgentBooleanQuestionModel } from './agent-boolean-question.model.js';
import { AgentNumberQuestionModel } from './agent-number-question.model.js';
import { AgentQuestionUnion } from './agent-question.union.js';
import { AgentSelectQuestionModel } from './agent-select-question.model.js';
import { AgentTextQuestionModel } from './agent-text-question.model.js';

@ObjectType()
export class AgentInputRequestModel {
  @Field(() => String)
  kind: string;

  @Field(() => String)
  requestId: string;

  @Field(() => String)
  message: string;

  @Field(() => [AgentQuestionUnion])
  questions: readonly (
    | AgentTextQuestionModel
    | AgentNumberQuestionModel
    | AgentBooleanQuestionModel
    | AgentSelectQuestionModel
  )[];
}
