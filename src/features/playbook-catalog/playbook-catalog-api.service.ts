import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import type { CatalogPageData, CatalogReadSelector } from './catalog.types.js';
import {
  BootstrapCatalogCommand,
  type BootstrapCatalogCommandReturnType,
  CommitCatalogCommand,
  type CommitCatalogCommandReturnType,
  CreateLaunchProfileCommand,
  type CreateLaunchProfileCommandData,
  type CreateLaunchProfileCommandReturnType,
  CreateMethodDocumentCommand,
  type CreateMethodDocumentCommandData,
  type CreateMethodDocumentCommandReturnType,
  CreatePipelineCommand,
  type CreatePipelineCommandData,
  type CreatePipelineCommandReturnType,
  CreatePipelineRoleCommand,
  type CreatePipelineRoleCommandData,
  type CreatePipelineRoleCommandReturnType,
  CreatePlaybookCommand,
  type CreatePlaybookCommandData,
  type CreatePlaybookCommandReturnType,
  CreateRoleCommand,
  type CreateRoleCommandData,
  type CreateRoleCommandReturnType,
  CreateRoleRefCommand,
  type CreateRoleRefCommandData,
  type CreateRoleRefCommandReturnType,
  CreateSharedReferenceCommand,
  type CreateSharedReferenceCommandData,
  type CreateSharedReferenceCommandReturnType,
  CreateStackCommand,
  type CreateStackCommandData,
  type CreateStackCommandReturnType,
  CreateStackRefCommand,
  type CreateStackRefCommandData,
  type CreateStackRefCommandReturnType,
  DeleteLaunchProfileCommand,
  type DeleteLaunchProfileCommandReturnType,
  DeleteMethodDocumentCommand,
  type DeleteMethodDocumentCommandReturnType,
  DeletePipelineCommand,
  type DeletePipelineCommandReturnType,
  DeletePipelineRoleCommand,
  type DeletePipelineRoleCommandReturnType,
  DeletePipelineSourceCommand,
  type DeletePipelineSourceCommandReturnType,
  DeletePlaybookCommand,
  type DeletePlaybookCommandReturnType,
  DeleteRoleCommand,
  type DeleteRoleCommandReturnType,
  DeleteRoleRefCommand,
  type DeleteRoleRefCommandReturnType,
  DeleteSharedReferenceCommand,
  type DeleteSharedReferenceCommandReturnType,
  DeleteStackCommand,
  type DeleteStackCommandReturnType,
  DeleteStackRefCommand,
  type DeleteStackRefCommandReturnType,
  DiscardCatalogCommand,
  type DiscardCatalogCommandReturnType,
  ImportCatalogCommand,
  type ImportCatalogCommandReturnType,
  UpdateLaunchProfileCommand,
  type UpdateLaunchProfileCommandData,
  type UpdateLaunchProfileCommandReturnType,
  UpdateMethodDocumentCommand,
  type UpdateMethodDocumentCommandData,
  type UpdateMethodDocumentCommandReturnType,
  UpdatePipelineCommand,
  type UpdatePipelineCommandData,
  type UpdatePipelineCommandReturnType,
  UpdatePipelineSourceCommand,
  type UpdatePipelineSourceCommandData,
  type UpdatePipelineSourceCommandReturnType,
  UpdatePlaybookCommand,
  type UpdatePlaybookCommandData,
  type UpdatePlaybookCommandReturnType,
  UpdateRoleCommand,
  type UpdateRoleCommandData,
  type UpdateRoleCommandReturnType,
  UpdateRoleRefCommand,
  type UpdateRoleRefCommandData,
  type UpdateRoleRefCommandReturnType,
  UpdateSharedReferenceCommand,
  type UpdateSharedReferenceCommandData,
  type UpdateSharedReferenceCommandReturnType,
  UpdateStackCommand,
  type UpdateStackCommandData,
  type UpdateStackCommandReturnType,
  UpdateStackRefCommand,
  type UpdateStackRefCommandData,
  type UpdateStackRefCommandReturnType,
} from './commands/index.js';
import {
  GetCatalogSnapshotQuery,
  type GetCatalogSnapshotQueryReturnType,
  GetCatalogStatusQuery,
  type GetCatalogStatusQueryReturnType,
  GetLaunchProfileQuery,
  type GetLaunchProfileQueryReturnType,
  GetMethodDocumentQuery,
  type GetMethodDocumentQueryReturnType,
  GetPipelineQuery,
  type GetPipelineQueryReturnType,
  GetPipelineRoleQuery,
  type GetPipelineRoleQueryReturnType,
  GetPipelineSlotQuery,
  type GetPipelineSlotQueryReturnType,
  GetPipelineSourceQuery,
  type GetPipelineSourceQueryReturnType,
  GetPlaybookQuery,
  type GetPlaybookQueryReturnType,
  GetRoleQuery,
  type GetRoleQueryReturnType,
  GetRoleRefQuery,
  type GetRoleRefQueryReturnType,
  GetSharedReferenceQuery,
  type GetSharedReferenceQueryReturnType,
  GetStackQuery,
  type GetStackQueryReturnType,
  GetStackRefQuery,
  type GetStackRefQueryReturnType,
  ListCatalogChangesQuery,
  type ListCatalogChangesQueryData,
  type ListCatalogChangesQueryReturnType,
  ListLaunchProfilesQuery,
  type ListLaunchProfilesQueryReturnType,
  ListMethodDocumentsQuery,
  type ListMethodDocumentsQueryReturnType,
  ListPipelineRolesQuery,
  type ListPipelineRolesQueryReturnType,
  ListPipelinesQuery,
  type ListPipelinesQueryReturnType,
  ListPipelineSlotsQuery,
  type ListPipelineSlotsQueryReturnType,
  ListPipelineSourcesQuery,
  type ListPipelineSourcesQueryReturnType,
  ListPlaybooksQuery,
  type ListPlaybooksQueryReturnType,
  ListRoleRefsQuery,
  type ListRoleRefsQueryReturnType,
  ListRolesQuery,
  type ListRolesQueryReturnType,
  ListSharedReferencesQuery,
  type ListSharedReferencesQueryReturnType,
  ListStackRefsQuery,
  type ListStackRefsQueryReturnType,
  ListStacksQuery,
  type ListStacksQueryReturnType,
} from './queries/index.js';

type ParentPageData<Parent extends string> = CatalogPageData & {
  readonly [Key in Parent]?: string;
};

@Injectable()
export class PlaybookCatalogApiService {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  bootstrapCatalog(): Promise<BootstrapCatalogCommandReturnType> {
    return this.commands.execute<BootstrapCatalogCommand, BootstrapCatalogCommandReturnType>(
      new BootstrapCatalogCommand(),
    );
  }

  getPlaybook(id: string, selector: CatalogReadSelector = {}): Promise<GetPlaybookQueryReturnType> {
    return this.queries.execute<GetPlaybookQuery, GetPlaybookQueryReturnType>(
      new GetPlaybookQuery({ id, ...selector }),
    );
  }

  listPlaybooks(data: CatalogPageData): Promise<ListPlaybooksQueryReturnType> {
    return this.queries.execute<ListPlaybooksQuery, ListPlaybooksQueryReturnType>(
      new ListPlaybooksQuery(data),
    );
  }

  createPlaybook(data: CreatePlaybookCommandData): Promise<CreatePlaybookCommandReturnType> {
    return this.commands.execute<CreatePlaybookCommand, CreatePlaybookCommandReturnType>(
      new CreatePlaybookCommand(data),
    );
  }

  updatePlaybook(data: UpdatePlaybookCommandData): Promise<UpdatePlaybookCommandReturnType> {
    return this.commands.execute<UpdatePlaybookCommand, UpdatePlaybookCommandReturnType>(
      new UpdatePlaybookCommand(data),
    );
  }

  deletePlaybook(id: string): Promise<DeletePlaybookCommandReturnType> {
    return this.commands.execute<DeletePlaybookCommand, DeletePlaybookCommandReturnType>(
      new DeletePlaybookCommand({ id }),
    );
  }

  getRole(id: string, selector: CatalogReadSelector = {}): Promise<GetRoleQueryReturnType> {
    return this.queries.execute<GetRoleQuery, GetRoleQueryReturnType>(
      new GetRoleQuery({ id, ...selector }),
    );
  }

  listRoles(data: ParentPageData<'playbookId'>): Promise<ListRolesQueryReturnType> {
    return this.queries.execute<ListRolesQuery, ListRolesQueryReturnType>(new ListRolesQuery(data));
  }

  createRole(data: CreateRoleCommandData): Promise<CreateRoleCommandReturnType> {
    return this.commands.execute<CreateRoleCommand, CreateRoleCommandReturnType>(
      new CreateRoleCommand(data),
    );
  }

  updateRole(data: UpdateRoleCommandData): Promise<UpdateRoleCommandReturnType> {
    return this.commands.execute<UpdateRoleCommand, UpdateRoleCommandReturnType>(
      new UpdateRoleCommand(data),
    );
  }

  deleteRole(id: string): Promise<DeleteRoleCommandReturnType> {
    return this.commands.execute<DeleteRoleCommand, DeleteRoleCommandReturnType>(
      new DeleteRoleCommand({ id }),
    );
  }

  getRoleRef(id: string, selector: CatalogReadSelector = {}): Promise<GetRoleRefQueryReturnType> {
    return this.queries.execute<GetRoleRefQuery, GetRoleRefQueryReturnType>(
      new GetRoleRefQuery({ id, ...selector }),
    );
  }

  listRoleRefs(data: ParentPageData<'roleId'>): Promise<ListRoleRefsQueryReturnType> {
    return this.queries.execute<ListRoleRefsQuery, ListRoleRefsQueryReturnType>(
      new ListRoleRefsQuery(data),
    );
  }

  createRoleRef(data: CreateRoleRefCommandData): Promise<CreateRoleRefCommandReturnType> {
    return this.commands.execute<CreateRoleRefCommand, CreateRoleRefCommandReturnType>(
      new CreateRoleRefCommand(data),
    );
  }

  updateRoleRef(data: UpdateRoleRefCommandData): Promise<UpdateRoleRefCommandReturnType> {
    return this.commands.execute<UpdateRoleRefCommand, UpdateRoleRefCommandReturnType>(
      new UpdateRoleRefCommand(data),
    );
  }

  deleteRoleRef(id: string): Promise<DeleteRoleRefCommandReturnType> {
    return this.commands.execute<DeleteRoleRefCommand, DeleteRoleRefCommandReturnType>(
      new DeleteRoleRefCommand({ id }),
    );
  }

  getSharedReference(
    id: string,
    selector: CatalogReadSelector = {},
  ): Promise<GetSharedReferenceQueryReturnType> {
    return this.queries.execute<GetSharedReferenceQuery, GetSharedReferenceQueryReturnType>(
      new GetSharedReferenceQuery({ id, ...selector }),
    );
  }

  listSharedReferences(
    data: ParentPageData<'playbookId'>,
  ): Promise<ListSharedReferencesQueryReturnType> {
    return this.queries.execute<ListSharedReferencesQuery, ListSharedReferencesQueryReturnType>(
      new ListSharedReferencesQuery(data),
    );
  }

  createSharedReference(
    data: CreateSharedReferenceCommandData,
  ): Promise<CreateSharedReferenceCommandReturnType> {
    return this.commands.execute<
      CreateSharedReferenceCommand,
      CreateSharedReferenceCommandReturnType
    >(new CreateSharedReferenceCommand(data));
  }

  updateSharedReference(
    data: UpdateSharedReferenceCommandData,
  ): Promise<UpdateSharedReferenceCommandReturnType> {
    return this.commands.execute<
      UpdateSharedReferenceCommand,
      UpdateSharedReferenceCommandReturnType
    >(new UpdateSharedReferenceCommand(data));
  }

  deleteSharedReference(id: string): Promise<DeleteSharedReferenceCommandReturnType> {
    return this.commands.execute<
      DeleteSharedReferenceCommand,
      DeleteSharedReferenceCommandReturnType
    >(new DeleteSharedReferenceCommand({ id }));
  }

  getStack(id: string, selector: CatalogReadSelector = {}): Promise<GetStackQueryReturnType> {
    return this.queries.execute<GetStackQuery, GetStackQueryReturnType>(
      new GetStackQuery({ id, ...selector }),
    );
  }

  listStacks(data: ParentPageData<'playbookId'>): Promise<ListStacksQueryReturnType> {
    return this.queries.execute<ListStacksQuery, ListStacksQueryReturnType>(
      new ListStacksQuery(data),
    );
  }

  createStack(data: CreateStackCommandData): Promise<CreateStackCommandReturnType> {
    return this.commands.execute<CreateStackCommand, CreateStackCommandReturnType>(
      new CreateStackCommand(data),
    );
  }

  updateStack(data: UpdateStackCommandData): Promise<UpdateStackCommandReturnType> {
    return this.commands.execute<UpdateStackCommand, UpdateStackCommandReturnType>(
      new UpdateStackCommand(data),
    );
  }

  deleteStack(id: string): Promise<DeleteStackCommandReturnType> {
    return this.commands.execute<DeleteStackCommand, DeleteStackCommandReturnType>(
      new DeleteStackCommand({ id }),
    );
  }

  getStackRef(id: string, selector: CatalogReadSelector = {}): Promise<GetStackRefQueryReturnType> {
    return this.queries.execute<GetStackRefQuery, GetStackRefQueryReturnType>(
      new GetStackRefQuery({ id, ...selector }),
    );
  }

  listStackRefs(data: ParentPageData<'stackId'>): Promise<ListStackRefsQueryReturnType> {
    return this.queries.execute<ListStackRefsQuery, ListStackRefsQueryReturnType>(
      new ListStackRefsQuery(data),
    );
  }

  createStackRef(data: CreateStackRefCommandData): Promise<CreateStackRefCommandReturnType> {
    return this.commands.execute<CreateStackRefCommand, CreateStackRefCommandReturnType>(
      new CreateStackRefCommand(data),
    );
  }

  updateStackRef(data: UpdateStackRefCommandData): Promise<UpdateStackRefCommandReturnType> {
    return this.commands.execute<UpdateStackRefCommand, UpdateStackRefCommandReturnType>(
      new UpdateStackRefCommand(data),
    );
  }

  deleteStackRef(id: string): Promise<DeleteStackRefCommandReturnType> {
    return this.commands.execute<DeleteStackRefCommand, DeleteStackRefCommandReturnType>(
      new DeleteStackRefCommand({ id }),
    );
  }

  getMethodDocument(
    id: string,
    selector: CatalogReadSelector = {},
  ): Promise<GetMethodDocumentQueryReturnType> {
    return this.queries.execute<GetMethodDocumentQuery, GetMethodDocumentQueryReturnType>(
      new GetMethodDocumentQuery({ id, ...selector }),
    );
  }

  listMethodDocuments(
    data: ParentPageData<'playbookId'>,
  ): Promise<ListMethodDocumentsQueryReturnType> {
    return this.queries.execute<ListMethodDocumentsQuery, ListMethodDocumentsQueryReturnType>(
      new ListMethodDocumentsQuery(data),
    );
  }

  createMethodDocument(
    data: CreateMethodDocumentCommandData,
  ): Promise<CreateMethodDocumentCommandReturnType> {
    return this.commands.execute<
      CreateMethodDocumentCommand,
      CreateMethodDocumentCommandReturnType
    >(new CreateMethodDocumentCommand(data));
  }

  updateMethodDocument(
    data: UpdateMethodDocumentCommandData,
  ): Promise<UpdateMethodDocumentCommandReturnType> {
    return this.commands.execute<
      UpdateMethodDocumentCommand,
      UpdateMethodDocumentCommandReturnType
    >(new UpdateMethodDocumentCommand(data));
  }

  deleteMethodDocument(id: string): Promise<DeleteMethodDocumentCommandReturnType> {
    return this.commands.execute<
      DeleteMethodDocumentCommand,
      DeleteMethodDocumentCommandReturnType
    >(new DeleteMethodDocumentCommand({ id }));
  }

  getPipeline(id: string, selector: CatalogReadSelector = {}): Promise<GetPipelineQueryReturnType> {
    return this.queries.execute<GetPipelineQuery, GetPipelineQueryReturnType>(
      new GetPipelineQuery({ id, ...selector }),
    );
  }

  listPipelines(data: ParentPageData<'playbookId'>): Promise<ListPipelinesQueryReturnType> {
    return this.queries.execute<ListPipelinesQuery, ListPipelinesQueryReturnType>(
      new ListPipelinesQuery(data),
    );
  }

  createPipeline(data: CreatePipelineCommandData): Promise<CreatePipelineCommandReturnType> {
    return this.commands.execute<CreatePipelineCommand, CreatePipelineCommandReturnType>(
      new CreatePipelineCommand(data),
    );
  }

  updatePipeline(data: UpdatePipelineCommandData): Promise<UpdatePipelineCommandReturnType> {
    return this.commands.execute<UpdatePipelineCommand, UpdatePipelineCommandReturnType>(
      new UpdatePipelineCommand(data),
    );
  }

  deletePipeline(id: string): Promise<DeletePipelineCommandReturnType> {
    return this.commands.execute<DeletePipelineCommand, DeletePipelineCommandReturnType>(
      new DeletePipelineCommand({ id }),
    );
  }

  getPipelineRole(
    id: string,
    selector: CatalogReadSelector = {},
  ): Promise<GetPipelineRoleQueryReturnType> {
    return this.queries.execute<GetPipelineRoleQuery, GetPipelineRoleQueryReturnType>(
      new GetPipelineRoleQuery({ id, ...selector }),
    );
  }

  listPipelineRoles(data: ParentPageData<'pipelineId'>): Promise<ListPipelineRolesQueryReturnType> {
    return this.queries.execute<ListPipelineRolesQuery, ListPipelineRolesQueryReturnType>(
      new ListPipelineRolesQuery(data),
    );
  }

  createPipelineRole(
    data: CreatePipelineRoleCommandData,
  ): Promise<CreatePipelineRoleCommandReturnType> {
    return this.commands.execute<CreatePipelineRoleCommand, CreatePipelineRoleCommandReturnType>(
      new CreatePipelineRoleCommand(data),
    );
  }

  deletePipelineRole(id: string): Promise<DeletePipelineRoleCommandReturnType> {
    return this.commands.execute<DeletePipelineRoleCommand, DeletePipelineRoleCommandReturnType>(
      new DeletePipelineRoleCommand({ id }),
    );
  }

  getPipelineSource(
    id: string,
    selector: CatalogReadSelector = {},
  ): Promise<GetPipelineSourceQueryReturnType> {
    return this.queries.execute<GetPipelineSourceQuery, GetPipelineSourceQueryReturnType>(
      new GetPipelineSourceQuery({ id, ...selector }),
    );
  }

  listPipelineSources(
    data: ParentPageData<'pipelineId'>,
  ): Promise<ListPipelineSourcesQueryReturnType> {
    return this.queries.execute<ListPipelineSourcesQuery, ListPipelineSourcesQueryReturnType>(
      new ListPipelineSourcesQuery(data),
    );
  }

  updatePipelineSource(
    data: UpdatePipelineSourceCommandData,
  ): Promise<UpdatePipelineSourceCommandReturnType> {
    return this.commands.execute<
      UpdatePipelineSourceCommand,
      UpdatePipelineSourceCommandReturnType
    >(new UpdatePipelineSourceCommand(data));
  }

  deletePipelineSource(id: string): Promise<DeletePipelineSourceCommandReturnType> {
    return this.commands.execute<
      DeletePipelineSourceCommand,
      DeletePipelineSourceCommandReturnType
    >(new DeletePipelineSourceCommand({ id }));
  }

  getPipelineSlot(
    id: string,
    selector: CatalogReadSelector = {},
  ): Promise<GetPipelineSlotQueryReturnType> {
    return this.queries.execute<GetPipelineSlotQuery, GetPipelineSlotQueryReturnType>(
      new GetPipelineSlotQuery({ id, ...selector }),
    );
  }

  listPipelineSlots(data: ParentPageData<'pipelineId'>): Promise<ListPipelineSlotsQueryReturnType> {
    return this.queries.execute<ListPipelineSlotsQuery, ListPipelineSlotsQueryReturnType>(
      new ListPipelineSlotsQuery(data),
    );
  }

  getLaunchProfile(
    id: string,
    selector: CatalogReadSelector = {},
  ): Promise<GetLaunchProfileQueryReturnType> {
    return this.queries.execute<GetLaunchProfileQuery, GetLaunchProfileQueryReturnType>(
      new GetLaunchProfileQuery({ id, ...selector }),
    );
  }

  listLaunchProfiles(
    data: ParentPageData<'pipelineId'>,
  ): Promise<ListLaunchProfilesQueryReturnType> {
    return this.queries.execute<ListLaunchProfilesQuery, ListLaunchProfilesQueryReturnType>(
      new ListLaunchProfilesQuery(data),
    );
  }

  createLaunchProfile(
    data: CreateLaunchProfileCommandData,
  ): Promise<CreateLaunchProfileCommandReturnType> {
    return this.commands.execute<CreateLaunchProfileCommand, CreateLaunchProfileCommandReturnType>(
      new CreateLaunchProfileCommand(data),
    );
  }

  updateLaunchProfile(
    data: UpdateLaunchProfileCommandData,
  ): Promise<UpdateLaunchProfileCommandReturnType> {
    return this.commands.execute<UpdateLaunchProfileCommand, UpdateLaunchProfileCommandReturnType>(
      new UpdateLaunchProfileCommand(data),
    );
  }

  deleteLaunchProfile(id: string): Promise<DeleteLaunchProfileCommandReturnType> {
    return this.commands.execute<DeleteLaunchProfileCommand, DeleteLaunchProfileCommandReturnType>(
      new DeleteLaunchProfileCommand({ id }),
    );
  }

  status(): Promise<GetCatalogStatusQueryReturnType> {
    return this.queries.execute<GetCatalogStatusQuery, GetCatalogStatusQueryReturnType>(
      new GetCatalogStatusQuery(),
    );
  }

  changes(data: ListCatalogChangesQueryData): Promise<ListCatalogChangesQueryReturnType> {
    return this.queries.execute<ListCatalogChangesQuery, ListCatalogChangesQueryReturnType>(
      new ListCatalogChangesQuery(data),
    );
  }

  snapshot(revisionId: string): Promise<GetCatalogSnapshotQueryReturnType> {
    return this.queries.execute<GetCatalogSnapshotQuery, GetCatalogSnapshotQueryReturnType>(
      new GetCatalogSnapshotQuery({ revisionId }),
    );
  }

  importCatalog(payload: unknown): Promise<ImportCatalogCommandReturnType> {
    return this.commands.execute<ImportCatalogCommand, ImportCatalogCommandReturnType>(
      new ImportCatalogCommand({ payload }),
    );
  }

  commitCatalog(message: string): Promise<CommitCatalogCommandReturnType> {
    return this.commands.execute<CommitCatalogCommand, CommitCatalogCommandReturnType>(
      new CommitCatalogCommand({ message }),
    );
  }

  discardCatalog(): Promise<DiscardCatalogCommandReturnType> {
    return this.commands.execute<DiscardCatalogCommand, DiscardCatalogCommandReturnType>(
      new DiscardCatalogCommand(),
    );
  }
}
