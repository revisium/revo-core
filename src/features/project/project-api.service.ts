import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
  ApplyContentModelCommand,
  type ApplyContentModelCommandReturnType,
  CleanupProjectDatasetCommand,
  type CleanupProjectDatasetCommandReturnType,
  CreateProjectRecordCommand,
  type CreateProjectRecordCommandReturnType,
  CreateUserProjectCommand,
  type CreateUserProjectCommandReturnType,
  DeleteProjectRecordCommand,
  type DeleteProjectRecordCommandReturnType,
  DeleteUserProjectCommand,
  type DeleteUserProjectCommandReturnType,
  EnsureProjectCommand,
  type EnsureProjectCommandData,
  type EnsureProjectCommandReturnType,
  UpdateProjectRecordCommand,
  type UpdateProjectRecordCommandReturnType,
} from './commands/index.js';
import { ProjectError } from './project-errors.js';
import {
  adrDataFromWrite,
  adrFromRow,
  CONTENT_TABLE,
  requirementDataFromWrite,
  requirementFromRow,
  workItemDataFromWrite,
  workItemFromRow,
  workPlanDataFromWrite,
  workPlanFromRow,
  type Adr,
  type AdrWriteData,
  type Connection,
  type ContentTableId,
  type RecordListData,
  type Requirement,
  type RequirementWriteData,
  type UserProject,
  type ProjectRecordData,
  type WorkItem,
  type WorkItemWriteData,
  type WorkPlan,
  type WorkPlanWriteData,
} from './project-records.js';
import {
  GetProjectQuery,
  type GetProjectQueryData,
  type GetProjectQueryReturnType,
  GetProjectRecordQuery,
  type GetProjectRecordQueryReturnType,
  GetUserProjectQuery,
  type GetUserProjectQueryReturnType,
  ListProjectRecordsQuery,
  type ListProjectRecordsQueryReturnType,
  ListUserProjectIdsQuery,
  type ListUserProjectIdsQueryReturnType,
  ListUserProjectsQuery,
  type ListUserProjectsQueryReturnType,
} from './queries/index.js';

type RecordDeleteData = {
  readonly projectId: string;
  readonly id: string;
};

type RecordRow = {
  readonly id: string;
  readonly data: unknown;
};

const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class ProjectApiService {
  private readonly logger = new Logger(ProjectApiService.name);

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

  async createUserProject(data: { name: string }): Promise<UserProject> {
    if (typeof data.name !== 'string' || data.name.trim() === '') {
      throw new BadRequestException(ProjectError.nameRequired);
    }

    const name = data.name.trim();
    const projectId = await this.commands.execute<
      CreateUserProjectCommand,
      CreateUserProjectCommandReturnType
    >(new CreateUserProjectCommand({ name }));

    try {
      await this.applyContentModel(projectId);
    } catch (error) {
      await this.removeCreatedProject(projectId);
      throw error;
    }

    const project = await this.getUserProject(projectId);
    if (project === null) {
      throw new NotFoundException(ProjectError.notFound);
    }

    return project;
  }

  async deleteUserProject(id: string): Promise<boolean> {
    await this.requireUserProject(id);
    await this.removeUserProject(id);
    return true;
  }

  getUserProject(id: string): Promise<GetUserProjectQueryReturnType> {
    return this.queries.execute<GetUserProjectQuery, GetUserProjectQueryReturnType>(
      new GetUserProjectQuery({ id }),
    );
  }

  listUserProjects(data: RecordListData): Promise<ListUserProjectsQueryReturnType> {
    this.requirePageSize(data.first);
    return this.queries.execute<ListUserProjectsQuery, ListUserProjectsQueryReturnType>(
      new ListUserProjectsQuery(data),
    );
  }

  listUserProjectIds(): Promise<ListUserProjectIdsQueryReturnType> {
    return this.queries.execute<ListUserProjectIdsQuery, ListUserProjectIdsQueryReturnType>(
      new ListUserProjectIdsQuery({}),
    );
  }

  applyContentModel(projectId: string): Promise<ApplyContentModelCommandReturnType> {
    return this.commands.execute<ApplyContentModelCommand, ApplyContentModelCommandReturnType>(
      new ApplyContentModelCommand({ projectId }),
    );
  }

  getAdr(projectId: string, id: string): Promise<Adr | null> {
    return this.getMappedRecord(projectId, CONTENT_TABLE.ADR, id, adrFromRow);
  }

  listAdrs(projectId: string, data: RecordListData): Promise<Connection<Adr>> {
    return this.listMappedRecords(projectId, CONTENT_TABLE.ADR, data, adrFromRow);
  }

  async createAdr(data: AdrWriteData): Promise<Adr> {
    const row = await this.createRecord(
      data.projectId,
      CONTENT_TABLE.ADR,
      data.id,
      adrDataFromWrite(data),
    );
    return adrFromRow(row);
  }

  async updateAdr(data: AdrWriteData): Promise<Adr> {
    const row = await this.updateRecord(
      data.projectId,
      CONTENT_TABLE.ADR,
      data.id,
      adrDataFromWrite(data),
    );
    return adrFromRow(row);
  }

  deleteAdr(data: RecordDeleteData): Promise<boolean> {
    return this.deleteRecord(data.projectId, CONTENT_TABLE.ADR, data.id);
  }

  getRequirement(projectId: string, id: string): Promise<Requirement | null> {
    return this.getMappedRecord(projectId, CONTENT_TABLE.Requirement, id, requirementFromRow);
  }

  listRequirements(projectId: string, data: RecordListData): Promise<Connection<Requirement>> {
    return this.listMappedRecords(projectId, CONTENT_TABLE.Requirement, data, requirementFromRow);
  }

  async createRequirement(data: RequirementWriteData): Promise<Requirement> {
    const row = await this.createRecord(
      data.projectId,
      CONTENT_TABLE.Requirement,
      data.id,
      requirementDataFromWrite(data),
    );
    return requirementFromRow(row);
  }

  async updateRequirement(data: RequirementWriteData): Promise<Requirement> {
    const row = await this.updateRecord(
      data.projectId,
      CONTENT_TABLE.Requirement,
      data.id,
      requirementDataFromWrite(data),
    );
    return requirementFromRow(row);
  }

  deleteRequirement(data: RecordDeleteData): Promise<boolean> {
    return this.deleteRecord(data.projectId, CONTENT_TABLE.Requirement, data.id);
  }

  getWorkPlan(projectId: string, id: string): Promise<WorkPlan | null> {
    return this.getMappedRecord(projectId, CONTENT_TABLE.WorkPlan, id, workPlanFromRow);
  }

  listWorkPlans(projectId: string, data: RecordListData): Promise<Connection<WorkPlan>> {
    return this.listMappedRecords(projectId, CONTENT_TABLE.WorkPlan, data, workPlanFromRow);
  }

  async createWorkPlan(data: WorkPlanWriteData): Promise<WorkPlan> {
    const row = await this.createRecord(
      data.projectId,
      CONTENT_TABLE.WorkPlan,
      data.id,
      workPlanDataFromWrite(data),
    );
    return workPlanFromRow(row);
  }

  async updateWorkPlan(data: WorkPlanWriteData): Promise<WorkPlan> {
    const row = await this.updateRecord(
      data.projectId,
      CONTENT_TABLE.WorkPlan,
      data.id,
      workPlanDataFromWrite(data),
    );
    return workPlanFromRow(row);
  }

  deleteWorkPlan(data: RecordDeleteData): Promise<boolean> {
    return this.deleteRecord(data.projectId, CONTENT_TABLE.WorkPlan, data.id);
  }

  getWorkItem(projectId: string, id: string): Promise<WorkItem | null> {
    return this.getMappedRecord(projectId, CONTENT_TABLE.WorkItem, id, workItemFromRow);
  }

  listWorkItems(projectId: string, data: RecordListData): Promise<Connection<WorkItem>> {
    return this.listMappedRecords(projectId, CONTENT_TABLE.WorkItem, data, workItemFromRow);
  }

  async createWorkItem(data: WorkItemWriteData): Promise<WorkItem> {
    const row = await this.createRecord(
      data.projectId,
      CONTENT_TABLE.WorkItem,
      data.id,
      workItemDataFromWrite(data),
    );
    return workItemFromRow(row);
  }

  async updateWorkItem(data: WorkItemWriteData): Promise<WorkItem> {
    const row = await this.updateRecord(
      data.projectId,
      CONTENT_TABLE.WorkItem,
      data.id,
      workItemDataFromWrite(data),
    );
    return workItemFromRow(row);
  }

  deleteWorkItem(data: RecordDeleteData): Promise<boolean> {
    return this.deleteRecord(data.projectId, CONTENT_TABLE.WorkItem, data.id);
  }

  private async requireUserProject(projectId: string): Promise<UserProject> {
    const project = await this.getUserProject(projectId);
    if (project === null) {
      throw new NotFoundException(ProjectError.notFound);
    }

    return project;
  }

  private async removeUserProject(projectId: string): Promise<void> {
    await this.commands.execute<DeleteUserProjectCommand, DeleteUserProjectCommandReturnType>(
      new DeleteUserProjectCommand({ projectId }),
    );
    await this.commands.execute<
      CleanupProjectDatasetCommand,
      CleanupProjectDatasetCommandReturnType
    >(new CleanupProjectDatasetCommand({ projectId }));
  }

  private async removeCreatedProject(projectId: string): Promise<void> {
    try {
      await this.removeUserProject(projectId);
    } catch (cleanupError) {
      const details =
        cleanupError instanceof Error ? cleanupError.message : 'Project remnant cleanup failed.';
      this.logger.error(details);
    }
  }

  private requirePageSize(first: number): void {
    if (!Number.isInteger(first) || first < MIN_PAGE_SIZE || first > MAX_PAGE_SIZE) {
      throw new BadRequestException(ProjectError.invalidPageSize);
    }
  }

  private requireRecordId(rowId: string): void {
    if (typeof rowId !== 'string' || rowId.trim() === '') {
      throw new BadRequestException(ProjectError.recordIdRequired);
    }
  }

  private async getMappedRecord<T>(
    projectId: string,
    tableId: ContentTableId,
    rowId: string,
    mapRow: (row: RecordRow) => T,
  ): Promise<T | null> {
    await this.requireUserProject(projectId);
    const row = await this.queries.execute<GetProjectRecordQuery, GetProjectRecordQueryReturnType>(
      new GetProjectRecordQuery({ projectId, tableId, rowId }),
    );
    if (row === null) {
      return null;
    }

    return mapRow(row);
  }

  private async listMappedRecords<T>(
    projectId: string,
    tableId: ContentTableId,
    data: RecordListData,
    mapRow: (row: RecordRow) => T,
  ): Promise<Connection<T>> {
    this.requirePageSize(data.first);
    await this.requireUserProject(projectId);
    const records = await this.queries.execute<
      ListProjectRecordsQuery,
      ListProjectRecordsQueryReturnType
    >(new ListProjectRecordsQuery({ projectId, tableId, ...data }));

    return {
      edges: records.edges.map((edge) => ({
        cursor: edge.cursor,
        node: mapRow(edge.node),
      })),
      pageInfo: records.pageInfo,
      totalCount: records.totalCount,
    };
  }

  private async createRecord(
    projectId: string,
    tableId: ContentTableId,
    rowId: string,
    data: ProjectRecordData,
  ): Promise<RecordRow> {
    this.requireRecordId(rowId);
    await this.requireUserProject(projectId);
    return this.commands.execute<CreateProjectRecordCommand, CreateProjectRecordCommandReturnType>(
      new CreateProjectRecordCommand({ projectId, tableId, rowId, data }),
    );
  }

  private async updateRecord(
    projectId: string,
    tableId: ContentTableId,
    rowId: string,
    data: ProjectRecordData,
  ): Promise<RecordRow> {
    this.requireRecordId(rowId);
    await this.requireUserProject(projectId);
    return this.commands.execute<UpdateProjectRecordCommand, UpdateProjectRecordCommandReturnType>(
      new UpdateProjectRecordCommand({ projectId, tableId, rowId, data }),
    );
  }

  private async deleteRecord(
    projectId: string,
    tableId: ContentTableId,
    rowId: string,
  ): Promise<boolean> {
    await this.requireUserProject(projectId);
    return this.commands.execute<DeleteProjectRecordCommand, DeleteProjectRecordCommandReturnType>(
      new DeleteProjectRecordCommand({ projectId, tableId, rowId }),
    );
  }
}
