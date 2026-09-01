import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
  ArchiveUserProjectCommand,
  type ArchiveUserProjectCommandData,
  type ArchiveUserProjectCommandReturnType,
  CreateAdrCommand,
  type CreateAdrCommandData,
  type CreateAdrCommandReturnType,
  CreateRequirementCommand,
  type CreateRequirementCommandData,
  type CreateRequirementCommandReturnType,
  CreateUserProjectCommand,
  type CreateUserProjectCommandData,
  type CreateUserProjectCommandReturnType,
  CreateWorkItemCommand,
  type CreateWorkItemCommandData,
  type CreateWorkItemCommandReturnType,
  CreateWorkPlanCommand,
  type CreateWorkPlanCommandData,
  type CreateWorkPlanCommandReturnType,
  DeleteAdrCommand,
  type DeleteAdrCommandReturnType,
  DeleteRequirementCommand,
  type DeleteRequirementCommandReturnType,
  DeleteWorkItemCommand,
  type DeleteWorkItemCommandReturnType,
  DeleteWorkPlanCommand,
  type DeleteWorkPlanCommandReturnType,
  EnsureProjectCommand,
  type EnsureProjectCommandData,
  type EnsureProjectCommandReturnType,
  RestoreUserProjectCommand,
  type RestoreUserProjectCommandData,
  type RestoreUserProjectCommandReturnType,
  UpdateAdrCommand,
  type UpdateAdrCommandReturnType,
  UpdateRequirementCommand,
  type UpdateRequirementCommandReturnType,
  UpdateUserProjectCommand,
  type UpdateUserProjectCommandData,
  type UpdateUserProjectCommandReturnType,
  UpdateWorkItemCommand,
  type UpdateWorkItemCommandReturnType,
  UpdateWorkPlanCommand,
  type UpdateWorkPlanCommandReturnType,
} from './commands/index.js';
import type { PageDataType } from './commands/utils/getOffsetPagination.js';
import {
  GetAdrQuery,
  type GetAdrQueryReturnType,
  GetProjectQuery,
  type GetProjectQueryData,
  type GetProjectQueryReturnType,
  GetRequirementQuery,
  type GetRequirementQueryReturnType,
  GetUserProjectQuery,
  type GetUserProjectQueryReturnType,
  GetWorkItemQuery,
  type GetWorkItemQueryReturnType,
  GetWorkPlanQuery,
  type GetWorkPlanQueryReturnType,
  ListAdrsQuery,
  type ListAdrsQueryReturnType,
  ListRequirementsQuery,
  type ListRequirementsQueryReturnType,
  ListUserProjectsQuery,
  type ListUserProjectsQueryData,
  type ListUserProjectsQueryReturnType,
  ListWorkItemsQuery,
  type ListWorkItemsQueryReturnType,
  ListWorkPlansQuery,
  type ListWorkPlansQueryReturnType,
} from './queries/index.js';
type RecordDeleteData = {
  readonly projectId: string;
  readonly id: string;
};

@Injectable()
export class ProjectApiService {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  ensureProject(data: EnsureProjectCommandData): Promise<EnsureProjectCommandReturnType> {
    return this.commands.execute<EnsureProjectCommand, EnsureProjectCommandReturnType>(
      new EnsureProjectCommand(data),
    );
  }

  getProject(data: GetProjectQueryData): Promise<GetProjectQueryReturnType> {
    return this.queries.execute<GetProjectQuery, GetProjectQueryReturnType>(
      new GetProjectQuery(data),
    );
  }

  createUserProject(
    data: CreateUserProjectCommandData,
  ): Promise<CreateUserProjectCommandReturnType> {
    return this.commands.execute<CreateUserProjectCommand, CreateUserProjectCommandReturnType>(
      new CreateUserProjectCommand(data),
    );
  }

  archiveUserProject(
    data: ArchiveUserProjectCommandData,
  ): Promise<ArchiveUserProjectCommandReturnType> {
    return this.commands.execute<ArchiveUserProjectCommand, ArchiveUserProjectCommandReturnType>(
      new ArchiveUserProjectCommand(data),
    );
  }

  updateUserProject(
    data: UpdateUserProjectCommandData,
  ): Promise<UpdateUserProjectCommandReturnType> {
    return this.commands.execute<UpdateUserProjectCommand, UpdateUserProjectCommandReturnType>(
      new UpdateUserProjectCommand(data),
    );
  }

  getUserProject(id: string): Promise<GetUserProjectQueryReturnType> {
    return this.queries.execute<GetUserProjectQuery, GetUserProjectQueryReturnType>(
      new GetUserProjectQuery({ id }),
    );
  }

  listUserProjects(data: ListUserProjectsQueryData): Promise<ListUserProjectsQueryReturnType> {
    return this.queries.execute<ListUserProjectsQuery, ListUserProjectsQueryReturnType>(
      new ListUserProjectsQuery(data),
    );
  }

  restoreUserProject(
    data: RestoreUserProjectCommandData,
  ): Promise<RestoreUserProjectCommandReturnType> {
    return this.commands.execute<RestoreUserProjectCommand, RestoreUserProjectCommandReturnType>(
      new RestoreUserProjectCommand(data),
    );
  }

  getAdr(projectId: string, id: string): Promise<GetAdrQueryReturnType> {
    return this.queries.execute<GetAdrQuery, GetAdrQueryReturnType>(
      new GetAdrQuery({ projectId, id }),
    );
  }

  listAdrs(projectId: string, data: PageDataType): Promise<ListAdrsQueryReturnType> {
    return this.queries.execute<ListAdrsQuery, ListAdrsQueryReturnType>(
      new ListAdrsQuery({ projectId, ...data }),
    );
  }

  createAdr(data: CreateAdrCommandData): Promise<CreateAdrCommandReturnType> {
    return this.commands.execute<CreateAdrCommand, CreateAdrCommandReturnType>(
      new CreateAdrCommand(data),
    );
  }

  updateAdr(data: CreateAdrCommandData): Promise<UpdateAdrCommandReturnType> {
    return this.commands.execute<UpdateAdrCommand, UpdateAdrCommandReturnType>(
      new UpdateAdrCommand(data),
    );
  }

  deleteAdr(data: RecordDeleteData): Promise<DeleteAdrCommandReturnType> {
    return this.commands.execute<DeleteAdrCommand, DeleteAdrCommandReturnType>(
      new DeleteAdrCommand(data),
    );
  }

  getRequirement(projectId: string, id: string): Promise<GetRequirementQueryReturnType> {
    return this.queries.execute<GetRequirementQuery, GetRequirementQueryReturnType>(
      new GetRequirementQuery({ projectId, id }),
    );
  }

  listRequirements(
    projectId: string,
    data: PageDataType,
  ): Promise<ListRequirementsQueryReturnType> {
    return this.queries.execute<ListRequirementsQuery, ListRequirementsQueryReturnType>(
      new ListRequirementsQuery({ projectId, ...data }),
    );
  }

  createRequirement(
    data: CreateRequirementCommandData,
  ): Promise<CreateRequirementCommandReturnType> {
    return this.commands.execute<CreateRequirementCommand, CreateRequirementCommandReturnType>(
      new CreateRequirementCommand(data),
    );
  }

  updateRequirement(
    data: CreateRequirementCommandData,
  ): Promise<UpdateRequirementCommandReturnType> {
    return this.commands.execute<UpdateRequirementCommand, UpdateRequirementCommandReturnType>(
      new UpdateRequirementCommand(data),
    );
  }

  deleteRequirement(data: RecordDeleteData): Promise<DeleteRequirementCommandReturnType> {
    return this.commands.execute<DeleteRequirementCommand, DeleteRequirementCommandReturnType>(
      new DeleteRequirementCommand(data),
    );
  }

  getWorkPlan(projectId: string, id: string): Promise<GetWorkPlanQueryReturnType> {
    return this.queries.execute<GetWorkPlanQuery, GetWorkPlanQueryReturnType>(
      new GetWorkPlanQuery({ projectId, id }),
    );
  }

  listWorkPlans(projectId: string, data: PageDataType): Promise<ListWorkPlansQueryReturnType> {
    return this.queries.execute<ListWorkPlansQuery, ListWorkPlansQueryReturnType>(
      new ListWorkPlansQuery({ projectId, ...data }),
    );
  }

  createWorkPlan(data: CreateWorkPlanCommandData): Promise<CreateWorkPlanCommandReturnType> {
    return this.commands.execute<CreateWorkPlanCommand, CreateWorkPlanCommandReturnType>(
      new CreateWorkPlanCommand(data),
    );
  }

  updateWorkPlan(data: CreateWorkPlanCommandData): Promise<UpdateWorkPlanCommandReturnType> {
    return this.commands.execute<UpdateWorkPlanCommand, UpdateWorkPlanCommandReturnType>(
      new UpdateWorkPlanCommand(data),
    );
  }

  deleteWorkPlan(data: RecordDeleteData): Promise<DeleteWorkPlanCommandReturnType> {
    return this.commands.execute<DeleteWorkPlanCommand, DeleteWorkPlanCommandReturnType>(
      new DeleteWorkPlanCommand(data),
    );
  }

  getWorkItem(projectId: string, id: string): Promise<GetWorkItemQueryReturnType> {
    return this.queries.execute<GetWorkItemQuery, GetWorkItemQueryReturnType>(
      new GetWorkItemQuery({ projectId, id }),
    );
  }

  listWorkItems(projectId: string, data: PageDataType): Promise<ListWorkItemsQueryReturnType> {
    return this.queries.execute<ListWorkItemsQuery, ListWorkItemsQueryReturnType>(
      new ListWorkItemsQuery({ projectId, ...data }),
    );
  }

  createWorkItem(data: CreateWorkItemCommandData): Promise<CreateWorkItemCommandReturnType> {
    return this.commands.execute<CreateWorkItemCommand, CreateWorkItemCommandReturnType>(
      new CreateWorkItemCommand(data),
    );
  }

  updateWorkItem(data: CreateWorkItemCommandData): Promise<UpdateWorkItemCommandReturnType> {
    return this.commands.execute<UpdateWorkItemCommand, UpdateWorkItemCommandReturnType>(
      new UpdateWorkItemCommand(data),
    );
  }

  deleteWorkItem(data: RecordDeleteData): Promise<DeleteWorkItemCommandReturnType> {
    return this.commands.execute<DeleteWorkItemCommand, DeleteWorkItemCommandReturnType>(
      new DeleteWorkItemCommand(data),
    );
  }
}
