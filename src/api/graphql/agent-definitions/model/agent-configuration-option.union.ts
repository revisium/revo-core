import { createUnionType } from '@nestjs/graphql';

import { AgentConfigurationBooleanModel } from './agent-configuration-boolean.model.js';
import { AgentConfigurationSelectModel } from './agent-configuration-select.model.js';

export const AgentConfigurationOptionUnion = createUnionType({
  name: 'AgentConfigurationOption',
  types: () => [AgentConfigurationSelectModel, AgentConfigurationBooleanModel] as const,
  resolveType: (value: { type: string }) =>
    value.type === 'select' ? AgentConfigurationSelectModel : AgentConfigurationBooleanModel,
});
