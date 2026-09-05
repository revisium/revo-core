import { createUnionType } from '@nestjs/graphql';

import { AgentInputRequestModel } from './agent-input-request.model.js';
import { AgentPermissionRequestModel } from './agent-permission-request.model.js';

export const AgentInteractionRequestUnion = createUnionType({
  name: 'AgentInteractionRequest',
  types: () => [AgentPermissionRequestModel, AgentInputRequestModel] as const,
  resolveType: (value: { kind: string }) =>
    value.kind === 'permission' ? AgentPermissionRequestModel : AgentInputRequestModel,
});
