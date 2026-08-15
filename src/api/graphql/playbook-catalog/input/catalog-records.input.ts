import { Field, ID, InputType, Int } from '@nestjs/graphql';

import {
  LaunchProfileStatus,
  MethodDocumentKind,
  PipelineRoleMembership,
  PipelineStrategy,
} from '../../../../features/playbook-catalog/constants/catalog.constants.js';

@InputType({ isAbstract: true })
export class CatalogRecordInput {
  @Field(() => ID)
  id: string;
}

@InputType()
export class PlaybookInput extends CatalogRecordInput {
  @Field()
  name: string;
}

@InputType()
export class RoleInput extends CatalogRecordInput {
  @Field(() => ID)
  playbookId: string;

  @Field()
  body: string;
}

@InputType()
export class RoleRefInput extends CatalogRecordInput {
  @Field(() => ID)
  roleId: string;

  @Field()
  body: string;
}

@InputType()
export class SharedReferenceInput extends CatalogRecordInput {
  @Field(() => ID)
  playbookId: string;

  @Field()
  body: string;
}

@InputType()
export class StackInput extends CatalogRecordInput {
  @Field(() => ID)
  playbookId: string;

  @Field()
  body: string;
}

@InputType()
export class StackRefInput extends CatalogRecordInput {
  @Field(() => ID)
  stackId: string;

  @Field()
  body: string;
}

@InputType()
export class MethodDocumentInput extends CatalogRecordInput {
  @Field(() => ID)
  playbookId: string;

  @Field(() => MethodDocumentKind)
  kind: MethodDocumentKind;

  @Field()
  body: string;
}

@InputType()
export class PipelineInput extends CatalogRecordInput {
  @Field(() => ID)
  playbookId: string;

  @Field()
  body: string;
}

@InputType()
export class PipelineRoleInput extends CatalogRecordInput {
  @Field(() => ID)
  pipelineId: string;

  @Field(() => ID)
  roleId: string;

  @Field(() => PipelineRoleMembership)
  membership: PipelineRoleMembership;
}

@InputType()
export class PipelineSourceInput extends CatalogRecordInput {
  @Field(() => ID)
  pipelineId: string;

  @Field()
  sourceJson: string;
}

@InputType()
export class BindingParticipantInput {
  @Field()
  bindingKey: string;

  @Field()
  runnerId: string;

  @Field()
  modelLevel: string;

  @Field()
  permissionMode: string;

  @Field(() => Int)
  timeoutMs: number;
}

@InputType()
export class LaunchBindingInput {
  @Field(() => ID)
  slotId: string;

  @Field(() => PipelineStrategy)
  strategy: PipelineStrategy;

  @Field(() => [BindingParticipantInput])
  participants: BindingParticipantInput[];
}

@InputType()
export class LaunchProfileInput extends CatalogRecordInput {
  @Field(() => ID)
  pipelineId: string;

  @Field(() => LaunchProfileStatus)
  status: LaunchProfileStatus;

  @Field(() => [LaunchBindingInput])
  bindings: LaunchBindingInput[];
}
