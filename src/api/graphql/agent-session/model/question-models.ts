import { AgentBooleanQuestionModel } from './agent-boolean-question.model.js';
import { AgentNumberQuestionModel } from './agent-number-question.model.js';
import { AgentSelectQuestionModel } from './agent-select-question.model.js';
import { AgentTextQuestionModel } from './agent-text-question.model.js';

export const questionModels = {
  text: AgentTextQuestionModel,
  number: AgentNumberQuestionModel,
  boolean: AgentBooleanQuestionModel,
  select: AgentSelectQuestionModel,
};
