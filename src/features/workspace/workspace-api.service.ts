import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
  CheckWorkspaceCommand,
  type CheckWorkspaceCommandData,
  type CheckWorkspaceCommandReturnType,
} from './commands/impl/check-workspace.command.js';
import {
  CreateWorkspaceCommand,
  type CreateWorkspaceCommandData,
  type CreateWorkspaceCommandReturnType,
} from './commands/impl/create-workspace.command.js';
import {
  DisconnectWorkspaceCommand,
  type DisconnectWorkspaceCommandData,
  type DisconnectWorkspaceCommandReturnType,
} from './commands/impl/disconnect-workspace.command.js';
import {
  UpdateWorkspaceCommand,
  type UpdateWorkspaceCommandData,
  type UpdateWorkspaceCommandReturnType,
} from './commands/impl/update-workspace.command.js';
import type { WorkspaceActorContext } from './contracts/workspace.contracts.js';
import {
  GetWorkspaceQuery,
  type GetWorkspaceQueryData,
  type GetWorkspaceQueryReturnType,
} from './queries/impl/get-workspace.query.js';
import {
  ListWorkspacesQuery,
  type ListWorkspacesQueryData,
  type ListWorkspacesQueryReturnType,
} from './queries/impl/list-workspaces.query.js';

@Injectable()
export class WorkspaceApiService {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  createWorkspace(
    data: CreateWorkspaceCommandData,
    context?: WorkspaceActorContext,
  ): Promise<CreateWorkspaceCommandReturnType> {
    return this.commands.execute<CreateWorkspaceCommand, CreateWorkspaceCommandReturnType>(
      new CreateWorkspaceCommand(data, context),
    );
  }

  updateWorkspace(
    data: UpdateWorkspaceCommandData,
    context?: WorkspaceActorContext,
  ): Promise<UpdateWorkspaceCommandReturnType> {
    return this.commands.execute<UpdateWorkspaceCommand, UpdateWorkspaceCommandReturnType>(
      new UpdateWorkspaceCommand(data, context),
    );
  }

  disconnectWorkspace(
    data: DisconnectWorkspaceCommandData,
    context?: WorkspaceActorContext,
  ): Promise<DisconnectWorkspaceCommandReturnType> {
    return this.commands.execute<DisconnectWorkspaceCommand, DisconnectWorkspaceCommandReturnType>(
      new DisconnectWorkspaceCommand(data, context),
    );
  }

  checkWorkspace(
    data: CheckWorkspaceCommandData,
    context?: WorkspaceActorContext,
  ): Promise<CheckWorkspaceCommandReturnType> {
    return this.commands.execute<CheckWorkspaceCommand, CheckWorkspaceCommandReturnType>(
      new CheckWorkspaceCommand(data, context),
    );
  }

  getWorkspace(data: GetWorkspaceQueryData): Promise<GetWorkspaceQueryReturnType> {
    return this.queries.execute<GetWorkspaceQuery, GetWorkspaceQueryReturnType>(
      new GetWorkspaceQuery(data),
    );
  }

  listWorkspaces(data: ListWorkspacesQueryData): Promise<ListWorkspacesQueryReturnType> {
    return this.queries.execute<ListWorkspacesQuery, ListWorkspacesQueryReturnType>(
      new ListWorkspacesQuery(data),
    );
  }
}
