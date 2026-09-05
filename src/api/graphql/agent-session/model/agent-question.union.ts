import { createUnionType } from '@nestjs/graphql';

import { AgentBooleanQuestionModel } from './agent-boolean-question.model.js';
import { AgentNumberQuestionModel } from './agent-number-question.model.js';
import { AgentSelectQuestionModel } from './agent-select-question.model.js';
import { AgentTextQuestionModel } from './agent-text-question.model.js';
import { questionModels } from './question-models.js';

export const AgentQuestionUnion = createUnionType({
  name: 'AgentQuestion',
  types: () =>
    [
      AgentTextQuestionModel,
      AgentNumberQuestionModel,
      AgentBooleanQuestionModel,
      AgentSelectQuestionModel,
    ] as const,
  resolveType: (value: { input: keyof typeof questionModels }) => questionModels[value.input],
});
