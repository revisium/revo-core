import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
  ArchiveWorkspaceCommand,
  type ArchiveWorkspaceCommandData,
  type ArchiveWorkspaceCommandReturnType,
} from './commands/impl/archive-workspace.command.js';
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
  UpdateWorkspaceCommand,
  type UpdateWorkspaceCommandData,
  type UpdateWorkspaceCommandReturnType,
} from './commands/impl/update-workspace.command.js';
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

  createWorkspace(data: CreateWorkspaceCommandData): Promise<CreateWorkspaceCommandReturnType> {
    return this.commands.execute<CreateWorkspaceCommand, CreateWorkspaceCommandReturnType>(
      new CreateWorkspaceCommand(data),
    );
  }

  updateWorkspace(data: UpdateWorkspaceCommandData): Promise<UpdateWorkspaceCommandReturnType> {
    return this.commands.execute<UpdateWorkspaceCommand, UpdateWorkspaceCommandReturnType>(
      new UpdateWorkspaceCommand(data),
    );
  }

  archiveWorkspace(data: ArchiveWorkspaceCommandData): Promise<ArchiveWorkspaceCommandReturnType> {
    return this.commands.execute<ArchiveWorkspaceCommand, ArchiveWorkspaceCommandReturnType>(
      new ArchiveWorkspaceCommand(data),
    );
  }

  checkWorkspace(data: CheckWorkspaceCommandData): Promise<CheckWorkspaceCommandReturnType> {
    return this.commands.execute<CheckWorkspaceCommand, CheckWorkspaceCommandReturnType>(
      new CheckWorkspaceCommand(data),
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
