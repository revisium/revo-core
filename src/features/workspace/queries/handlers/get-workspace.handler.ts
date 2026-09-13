import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { WorkspaceProjectService } from '../../application/workspace-project.service.js';
import { WorkspaceStoreService } from '../../storage/workspace-store.service.js';
import { toWorkspace } from '../../storage/workspace.mapper.js';
import {
  GetWorkspaceQuery,
  type GetWorkspaceQueryReturnType,
} from '../impl/get-workspace.query.js';

@QueryHandler(GetWorkspaceQuery)
export class GetWorkspaceHandler implements IQueryHandler<
  GetWorkspaceQuery,
  GetWorkspaceQueryReturnType
> {
  constructor(
    private readonly projects: WorkspaceProjectService,
    private readonly store: WorkspaceStoreService,
  ) {}

  async execute({ data }: GetWorkspaceQuery): Promise<GetWorkspaceQueryReturnType> {
    await this.projects.assertAccessible(data.projectId);

    return toWorkspace(await this.store.get(data.projectId, data.id));
  }
}
