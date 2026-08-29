import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

import type {
  CatalogPageData,
  CatalogReadSelector,
} from '../../../features/playbook-catalog/catalog.types.js';
import {
  CatalogScope,
  CatalogTable,
} from '../../../features/playbook-catalog/constants/catalog.constants.js';
import { PlaybookCatalogApiService } from '../../../features/playbook-catalog/playbook-catalog-api.service.js';
import {
  LaunchProfileInput,
  MethodDocumentInput,
  PipelineInput,
  PipelineRoleInput,
  PlaybookInput,
  RoleInput,
  RoleRefInput,
  SharedReferenceInput,
  StackInput,
  StackRefInput,
} from './input/catalog-records.input.js';
import {
  CatalogChangeConnectionModel,
  CatalogCommitResultModel,
  CatalogImportResultModel,
  CatalogMutationResultModel,
  CatalogSnapshotModel,
  CatalogStatusModel,
  LaunchProfileConnectionModel,
  LaunchProfileModel,
  MethodDocumentConnectionModel,
  MethodDocumentModel,
  PipelineConnectionModel,
  PipelineModel,
  PipelineRoleConnectionModel,
  PipelineRoleModel,
  PlaybookConnectionModel,
  PlaybookModel,
  RoleConnectionModel,
  RoleModel,
  RoleRefConnectionModel,
  RoleRefModel,
  SharedReferenceConnectionModel,
  SharedReferenceModel,
  StackConnectionModel,
  StackModel,
  StackRefConnectionModel,
  StackRefModel,
} from './model/catalog-records.model.js';

@Resolver()
export class PlaybookCatalogResolver {
  constructor(private readonly catalog: PlaybookCatalogApiService) {}

  @Query(() => PlaybookConnectionModel)
  playbooks(
    @Args('first', { type: () => Int }) first: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.listPlaybooks(this.page(first, after, scope, revisionId));
  }

  @Query(() => PlaybookModel)
  playbook(
    @Args('id', { type: () => ID }) id: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.getPlaybook(id, this.selector(scope, revisionId));
  }

  @Query(() => RoleConnectionModel)
  roles(
    @Args('first', { type: () => Int }) first: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('playbookId', { type: () => ID, nullable: true }) playbookId?: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.listRoles({
      ...this.page(first, after, scope, revisionId),
      ...(playbookId === undefined ? {} : { playbookId }),
    });
  }

  @Query(() => RoleModel)
  role(
    @Args('id', { type: () => ID }) id: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.getRole(id, this.selector(scope, revisionId));
  }

  @Query(() => RoleRefConnectionModel)
  roleRefs(
    @Args('first', { type: () => Int }) first: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('roleId', { type: () => ID, nullable: true }) roleId?: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.listRoleRefs({
      ...this.page(first, after, scope, revisionId),
      ...(roleId === undefined ? {} : { roleId }),
    });
  }

  @Query(() => RoleRefModel)
  roleRef(
    @Args('id', { type: () => ID }) id: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.getRoleRef(id, this.selector(scope, revisionId));
  }

  @Query(() => SharedReferenceConnectionModel)
  sharedReferences(
    @Args('first', { type: () => Int }) first: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('playbookId', { type: () => ID, nullable: true }) playbookId?: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.listSharedReferences({
      ...this.page(first, after, scope, revisionId),
      ...(playbookId === undefined ? {} : { playbookId }),
    });
  }

  @Query(() => SharedReferenceModel)
  sharedReference(
    @Args('id', { type: () => ID }) id: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.getSharedReference(id, this.selector(scope, revisionId));
  }

  @Query(() => StackConnectionModel)
  stacks(
    @Args('first', { type: () => Int }) first: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('playbookId', { type: () => ID, nullable: true }) playbookId?: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.listStacks({
      ...this.page(first, after, scope, revisionId),
      ...(playbookId === undefined ? {} : { playbookId }),
    });
  }

  @Query(() => StackModel)
  stack(
    @Args('id', { type: () => ID }) id: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.getStack(id, this.selector(scope, revisionId));
  }

  @Query(() => StackRefConnectionModel)
  stackRefs(
    @Args('first', { type: () => Int }) first: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('stackId', { type: () => ID, nullable: true }) stackId?: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.listStackRefs({
      ...this.page(first, after, scope, revisionId),
      ...(stackId === undefined ? {} : { stackId }),
    });
  }

  @Query(() => StackRefModel)
  stackRef(
    @Args('id', { type: () => ID }) id: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.getStackRef(id, this.selector(scope, revisionId));
  }

  @Query(() => MethodDocumentConnectionModel)
  methodDocuments(
    @Args('first', { type: () => Int }) first: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('playbookId', { type: () => ID, nullable: true }) playbookId?: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.listMethodDocuments({
      ...this.page(first, after, scope, revisionId),
      ...(playbookId === undefined ? {} : { playbookId }),
    });
  }

  @Query(() => MethodDocumentModel)
  methodDocument(
    @Args('id', { type: () => ID }) id: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.getMethodDocument(id, this.selector(scope, revisionId));
  }

  @Query(() => PipelineConnectionModel)
  pipelines(
    @Args('first', { type: () => Int }) first: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('playbookId', { type: () => ID, nullable: true }) playbookId?: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.listPipelines({
      ...this.page(first, after, scope, revisionId),
      ...(playbookId === undefined ? {} : { playbookId }),
    });
  }

  @Query(() => PipelineModel)
  pipeline(
    @Args('id', { type: () => ID }) id: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.getPipeline(id, this.selector(scope, revisionId));
  }

  @Query(() => PipelineRoleConnectionModel)
  pipelineRoles(
    @Args('first', { type: () => Int }) first: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('pipelineId', { type: () => ID, nullable: true }) pipelineId?: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.listPipelineRoles({
      ...this.page(first, after, scope, revisionId),
      ...(pipelineId === undefined ? {} : { pipelineId }),
    });
  }

  @Query(() => PipelineRoleModel)
  pipelineRole(
    @Args('id', { type: () => ID }) id: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.getPipelineRole(id, this.selector(scope, revisionId));
  }

  @Query(() => LaunchProfileConnectionModel)
  launchProfiles(
    @Args('first', { type: () => Int }) first: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('pipelineId', { type: () => ID, nullable: true }) pipelineId?: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.listLaunchProfiles({
      ...this.page(first, after, scope, revisionId),
      ...(pipelineId === undefined ? {} : { pipelineId }),
    });
  }

  @Query(() => LaunchProfileModel)
  launchProfile(
    @Args('id', { type: () => ID }) id: string,
    @Args('scope', { type: () => CatalogScope, defaultValue: CatalogScope.HEAD })
    scope: CatalogScope = CatalogScope.HEAD,
    @Args('revisionId', { type: () => ID, nullable: true }) revisionId?: string,
  ) {
    return this.catalog.getLaunchProfile(id, this.selector(scope, revisionId));
  }

  @Query(() => CatalogStatusModel)
  catalogStatus() {
    return this.catalog.status();
  }

  @Query(() => CatalogChangeConnectionModel)
  catalogChangeSet(
    @Args('first', { type: () => Int }) first: number,
    @Args('after', { nullable: true }) after?: string,
  ) {
    return this.catalog.changes(after === undefined ? { first } : { first, after });
  }

  @Query(() => CatalogSnapshotModel)
  async catalogSnapshot(@Args('revisionId', { type: () => ID }) revisionId: string) {
    const snapshot = await this.catalog.snapshot(revisionId);
    return {
      revisionId: snapshot.revisionId,
      isHead: snapshot.isHead,
      playbooks: snapshot.tables[CatalogTable.playbooks],
      roles: snapshot.tables[CatalogTable.roles],
      roleRefs: snapshot.tables[CatalogTable.roleRefs],
      sharedReferences: snapshot.tables[CatalogTable.sharedReferences],
      stacks: snapshot.tables[CatalogTable.stacks],
      stackRefs: snapshot.tables[CatalogTable.stackRefs],
      methodDocuments: snapshot.tables[CatalogTable.methodDocuments],
      pipelines: snapshot.tables[CatalogTable.pipelines],
      pipelineRoles: snapshot.tables[CatalogTable.pipelineRoles],
      launchProfiles: snapshot.tables[CatalogTable.launchProfiles],
    };
  }

  @Mutation(() => PlaybookModel)
  createPlaybook(@Args('data') data: PlaybookInput) {
    return this.catalog.createPlaybook({ ...data });
  }
  @Mutation(() => PlaybookModel)
  updatePlaybook(@Args('data') data: PlaybookInput) {
    return this.catalog.updatePlaybook({ ...data });
  }
  @Mutation(() => Boolean)
  deletePlaybook(@Args('id', { type: () => ID }) id: string) {
    return this.catalog.deletePlaybook(id);
  }
  @Mutation(() => RoleModel)
  createRole(@Args('data') data: RoleInput) {
    return this.catalog.createRole({ ...data });
  }
  @Mutation(() => RoleModel)
  updateRole(@Args('data') data: RoleInput) {
    return this.catalog.updateRole({ ...data });
  }
  @Mutation(() => Boolean)
  deleteRole(@Args('id', { type: () => ID }) id: string) {
    return this.catalog.deleteRole(id);
  }
  @Mutation(() => RoleRefModel)
  createRoleRef(@Args('data') data: RoleRefInput) {
    return this.catalog.createRoleRef({ ...data });
  }
  @Mutation(() => RoleRefModel)
  updateRoleRef(@Args('data') data: RoleRefInput) {
    return this.catalog.updateRoleRef({ ...data });
  }
  @Mutation(() => Boolean)
  deleteRoleRef(@Args('id', { type: () => ID }) id: string) {
    return this.catalog.deleteRoleRef(id);
  }
  @Mutation(() => SharedReferenceModel)
  createSharedReference(@Args('data') data: SharedReferenceInput) {
    return this.catalog.createSharedReference({ ...data });
  }
  @Mutation(() => SharedReferenceModel)
  updateSharedReference(@Args('data') data: SharedReferenceInput) {
    return this.catalog.updateSharedReference({ ...data });
  }
  @Mutation(() => Boolean)
  deleteSharedReference(@Args('id', { type: () => ID }) id: string) {
    return this.catalog.deleteSharedReference(id);
  }
  @Mutation(() => StackModel)
  createStack(@Args('data') data: StackInput) {
    return this.catalog.createStack({ ...data });
  }
  @Mutation(() => StackModel)
  updateStack(@Args('data') data: StackInput) {
    return this.catalog.updateStack({ ...data });
  }
  @Mutation(() => Boolean)
  deleteStack(@Args('id', { type: () => ID }) id: string) {
    return this.catalog.deleteStack(id);
  }
  @Mutation(() => StackRefModel)
  createStackRef(@Args('data') data: StackRefInput) {
    return this.catalog.createStackRef({ ...data });
  }
  @Mutation(() => StackRefModel)
  updateStackRef(@Args('data') data: StackRefInput) {
    return this.catalog.updateStackRef({ ...data });
  }
  @Mutation(() => Boolean)
  deleteStackRef(@Args('id', { type: () => ID }) id: string) {
    return this.catalog.deleteStackRef(id);
  }
  @Mutation(() => MethodDocumentModel)
  createMethodDocument(@Args('data') data: MethodDocumentInput) {
    return this.catalog.createMethodDocument({ ...data });
  }
  @Mutation(() => MethodDocumentModel)
  updateMethodDocument(@Args('data') data: MethodDocumentInput) {
    return this.catalog.updateMethodDocument({ ...data });
  }
  @Mutation(() => Boolean)
  deleteMethodDocument(@Args('id', { type: () => ID }) id: string) {
    return this.catalog.deleteMethodDocument(id);
  }
  @Mutation(() => PipelineModel)
  createPipeline(@Args('data') data: PipelineInput) {
    return this.catalog.createPipeline({ ...data });
  }
  @Mutation(() => PipelineModel)
  updatePipeline(@Args('data') data: PipelineInput) {
    return this.catalog.updatePipeline({ ...data });
  }
  @Mutation(() => Boolean)
  deletePipeline(@Args('id', { type: () => ID }) id: string) {
    return this.catalog.deletePipeline(id);
  }
  @Mutation(() => PipelineRoleModel)
  createPipelineRole(@Args('data') data: PipelineRoleInput) {
    return this.catalog.createPipelineRole({ ...data });
  }
  @Mutation(() => Boolean)
  deletePipelineRole(@Args('id', { type: () => ID }) id: string) {
    return this.catalog.deletePipelineRole(id);
  }
  @Mutation(() => LaunchProfileModel)
  createLaunchProfile(@Args('data') data: LaunchProfileInput) {
    return this.catalog.createLaunchProfile({ ...data });
  }
  @Mutation(() => LaunchProfileModel)
  updateLaunchProfile(@Args('data') data: LaunchProfileInput) {
    return this.catalog.updateLaunchProfile({ ...data });
  }
  @Mutation(() => Boolean)
  deleteLaunchProfile(@Args('id', { type: () => ID }) id: string) {
    return this.catalog.deleteLaunchProfile(id);
  }
  @Mutation(() => CatalogImportResultModel)
  importCatalog(@Args('data', { type: () => GraphQLJSON }) data: unknown) {
    return this.catalog.importCatalog(data);
  }
  @Mutation(() => CatalogCommitResultModel)
  commitCatalog(@Args('message') message: string) {
    return this.catalog.commitCatalog(message);
  }
  @Mutation(() => CatalogMutationResultModel)
  discardCatalog() {
    return this.catalog.discardCatalog();
  }

  private selector(scope: CatalogScope, revisionId?: string): CatalogReadSelector {
    return revisionId === undefined ? { scope } : { scope, revisionId };
  }

  private page(
    first: number,
    after: string | undefined,
    scope: CatalogScope,
    revisionId: string | undefined,
  ): CatalogPageData {
    return {
      first,
      ...this.selector(scope, revisionId),
      ...(after === undefined ? {} : { after }),
    };
  }
}
