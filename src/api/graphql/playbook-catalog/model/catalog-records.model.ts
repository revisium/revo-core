import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type { PipelineSourcePackage, RunProfile } from '@revisium/revo-run';
import { GraphQLJSON } from 'graphql-scalars';

import { CatalogTable } from '../../../../features/playbook-catalog/contracts/catalog-table.js';
import {
  CatalogChangeType,
  LaunchProfileStatus,
  MethodDocumentKind,
  PipelineRoleMembership,
} from '../../../../features/playbook-catalog/contracts/catalog.enums.js';
import { Paginated } from '../../share/paginated.js';

@ObjectType({ isAbstract: true })
export class CatalogRecordModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  revisionId: string;

  @Field()
  isHead: boolean;
}

@ObjectType()
export class PlaybookModel extends CatalogRecordModel {
  @Field()
  name: string;
}

@ObjectType()
export class RoleModel extends CatalogRecordModel {
  @Field(() => ID)
  playbookId: string;

  @Field()
  body: string;
}

@ObjectType()
export class RoleRefModel extends CatalogRecordModel {
  @Field(() => ID)
  roleId: string;

  @Field()
  body: string;
}

@ObjectType()
export class SharedReferenceModel extends CatalogRecordModel {
  @Field(() => ID)
  playbookId: string;

  @Field()
  body: string;
}

@ObjectType()
export class StackModel extends CatalogRecordModel {
  @Field(() => ID)
  playbookId: string;

  @Field()
  body: string;
}

@ObjectType()
export class StackRefModel extends CatalogRecordModel {
  @Field(() => ID)
  stackId: string;

  @Field()
  body: string;
}

@ObjectType()
export class MethodDocumentModel extends CatalogRecordModel {
  @Field(() => ID)
  playbookId: string;

  @Field(() => MethodDocumentKind)
  kind: MethodDocumentKind;

  @Field()
  body: string;
}

@ObjectType()
export class PipelineModel extends CatalogRecordModel {
  @Field(() => ID)
  playbookId: string;

  @Field(() => GraphQLJSON)
  pipeline: PipelineSourcePackage;
}

@ObjectType()
export class PipelineRoleModel extends CatalogRecordModel {
  @Field(() => ID)
  pipelineId: string;

  @Field(() => ID)
  roleId: string;

  @Field(() => PipelineRoleMembership)
  membership: PipelineRoleMembership;
}

@ObjectType()
export class LaunchProfileModel extends CatalogRecordModel {
  @Field(() => ID)
  pipelineId: string;

  @Field(() => LaunchProfileStatus)
  status: LaunchProfileStatus;

  @Field(() => GraphQLJSON)
  profile: RunProfile;
}

@ObjectType()
export class CatalogStatusModel {
  @Field(() => ID)
  headRevisionId: string;

  @Field(() => ID)
  draftRevisionId: string;

  @Field()
  hasChanges: boolean;

  @Field(() => Int)
  totalChanges: number;
}

@ObjectType()
export class CatalogChangeEntryModel {
  @Field(() => ID)
  entryId: string;

  @Field(() => CatalogTable)
  tableId: CatalogTable;

  @Field(() => ID)
  recordId: string;

  @Field(() => ID, { nullable: true })
  previousRecordId?: string;

  @Field(() => CatalogChangeType)
  changeType: CatalogChangeType;

  @Field(() => [String])
  fieldPaths: string[];
}

export const PlaybookConnectionModel = Paginated(PlaybookModel);
export const RoleConnectionModel = Paginated(RoleModel);
export const RoleRefConnectionModel = Paginated(RoleRefModel);
export const SharedReferenceConnectionModel = Paginated(SharedReferenceModel);
export const StackConnectionModel = Paginated(StackModel);
export const StackRefConnectionModel = Paginated(StackRefModel);
export const MethodDocumentConnectionModel = Paginated(MethodDocumentModel);
export const PipelineConnectionModel = Paginated(PipelineModel);
export const PipelineRoleConnectionModel = Paginated(PipelineRoleModel);
export const LaunchProfileConnectionModel = Paginated(LaunchProfileModel);
export const CatalogChangeConnectionModel = Paginated(CatalogChangeEntryModel);

@ObjectType()
export class CatalogMutationResultModel {
  @Field(() => CatalogStatusModel)
  status: CatalogStatusModel;

  @Field(() => CatalogChangeConnectionModel)
  changes: InstanceType<typeof CatalogChangeConnectionModel>;
}

@ObjectType()
export class CatalogCommitResultModel {
  @Field(() => ID)
  revisionId: string;

  @Field(() => ID)
  previousRevisionId: string;
}

@ObjectType()
export class CatalogImportTableResultModel {
  @Field(() => CatalogTable)
  tableId: CatalogTable;

  @Field(() => Int)
  created: number;

  @Field(() => Int)
  updated: number;
}

@ObjectType()
export class CatalogImportResultModel {
  @Field(() => [CatalogImportTableResultModel])
  tables: CatalogImportTableResultModel[];
}

@ObjectType()
export class CatalogSnapshotModel {
  @Field(() => ID)
  revisionId: string;

  @Field()
  isHead: boolean;

  @Field(() => [PlaybookModel])
  playbooks: PlaybookModel[];

  @Field(() => [RoleModel])
  roles: RoleModel[];

  @Field(() => [RoleRefModel])
  roleRefs: RoleRefModel[];

  @Field(() => [SharedReferenceModel])
  sharedReferences: SharedReferenceModel[];

  @Field(() => [StackModel])
  stacks: StackModel[];

  @Field(() => [StackRefModel])
  stackRefs: StackRefModel[];

  @Field(() => [MethodDocumentModel])
  methodDocuments: MethodDocumentModel[];

  @Field(() => [PipelineModel])
  pipelines: PipelineModel[];

  @Field(() => [PipelineRoleModel])
  pipelineRoles: PipelineRoleModel[];

  @Field(() => [LaunchProfileModel])
  launchProfiles: LaunchProfileModel[];
}
