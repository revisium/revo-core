import { UseFilters } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { WorkspaceApiService } from '../../../features/workspace/workspace-api.service.js';
import { WorkspaceRequestContextService } from '../../workspace/workspace-request-context.service.js';
import { CreateWorkspaceResultModel } from './model/create-workspace-result.model.js';
import { CreateWorkspaceInput } from './model/create-workspace.input.js';
import { UpdateWorkspaceInput } from './model/update-workspace.input.js';
import { WorkspaceConnectionModel } from './model/workspace-connection.model.js';
import { WorkspaceListInput } from './model/workspace-list.input.js';
import { WorkspaceInput } from './model/workspace.input.js';
import { WorkspaceModel } from './model/workspace.model.js';
import { WorkspaceGraphqlExceptionFilter } from './workspace-graphql-exception.filter.js';
import { registerWorkspaceEnums } from './workspace.enums.js';

registerWorkspaceEnums();

@Resolver()
@UseFilters(WorkspaceGraphqlExceptionFilter)
export class WorkspaceResolver {
  constructor(
    private readonly api: WorkspaceApiService,
    private readonly context: WorkspaceRequestContextService,
  ) {}

  @Query(() => WorkspaceModel)
  workspace(@Args('data') data: WorkspaceInput) {
    return this.api.getWorkspace(data);
  }

  @Query(() => WorkspaceConnectionModel)
  workspaces(@Args('data') data: WorkspaceListInput) {
    return this.api.listWorkspaces(data);
  }

  @Mutation(() => CreateWorkspaceResultModel)
  createWorkspace(@Args('data') data: CreateWorkspaceInput) {
    return this.api.createWorkspace(data, this.context.getContext());
  }

  @Mutation(() => Boolean)
  updateWorkspace(@Args('data') data: UpdateWorkspaceInput) {
    return this.api.updateWorkspace(data, this.context.getContext());
  }

  @Mutation(() => Boolean)
  checkWorkspace(@Args('data') data: WorkspaceInput) {
    return this.api.checkWorkspace(data, this.context.getContext());
  }

  @Mutation(() => Boolean)
  disconnectWorkspace(@Args('data') data: WorkspaceInput) {
    return this.api.disconnectWorkspace(data, this.context.getContext());
  }
}
