import { Field, ObjectType } from '@nestjs/graphql';

import { AgentConfigurationBooleanModel } from './agent-configuration-boolean.model.js';
import { AgentConfigurationModelView } from './agent-configuration-model-view.js';
import { AgentConfigurationOptionUnion } from './agent-configuration-option.union.js';
import { AgentConfigurationSelectModel } from './agent-configuration-select.model.js';
import { AgentLaunchEvidenceModel } from './agent-launch-evidence.model.js';
import { AgentRefModel } from './agent-ref.model.js';

@ObjectType()
export class AgentConfigurationCatalogModel {
  @Field(() => String)
  schemaVersion: string;

  @Field(() => AgentRefModel)
  agent: AgentRefModel;

  @Field(() => String)
  definitionDigest: string;

  @Field(() => String)
  catalogRevision: string;

  @Field(() => AgentLaunchEvidenceModel)
  launch: AgentLaunchEvidenceModel;

  @Field(() => [AgentConfigurationOptionUnion])
  options: readonly (AgentConfigurationSelectModel | AgentConfigurationBooleanModel)[];

  @Field(() => AgentConfigurationModelView, { nullable: true })
  model?: AgentConfigurationModelView;
}
