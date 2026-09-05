import { Field, ObjectType } from '@nestjs/graphql';

import { AgentCapabilitiesModel } from './agent-capabilities.model.js';
import { AgentRefModel } from './agent-ref.model.js';

@ObjectType()
export class AgentDescriptorModel {
  @Field(() => AgentRefModel)
  agent: AgentRefModel;

  @Field(() => String)
  definitionDigest: string;

  @Field(() => String)
  displayName: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => AgentCapabilitiesModel)
  capabilities: AgentCapabilitiesModel;
}
