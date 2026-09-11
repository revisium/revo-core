import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { AgentConfigurationsStatus } from '../../../../features/agent-definitions/contracts/agent-configurations.contracts.js';
import { AgentConfigurationCatalogModel } from './agent-configuration-catalog.model.js';

registerEnumType(AgentConfigurationsStatus, { name: 'AgentConfigurationsStatus' });

@ObjectType()
export class AgentConfigurationsModel {
  @Field(() => AgentConfigurationsStatus)
  status: AgentConfigurationsStatus;

  @Field(() => [AgentConfigurationCatalogModel])
  catalogs: readonly AgentConfigurationCatalogModel[];
}
