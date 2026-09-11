import { Query } from '@nestjs/cqrs';

import type { AgentConfigurationsSnapshot } from '../../contracts/agent-configurations.contracts.js';

export type GetAgentConfigurationsQueryReturnType = AgentConfigurationsSnapshot;

export class GetAgentConfigurationsQuery extends Query<GetAgentConfigurationsQueryReturnType> {}
