import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { LocalWorkspaceSourceService } from '../../source/local-workspace-source.service.js';
import { workspacePath, workspaceType } from '../../validation/workspace-input.js';
import {
  CheckWorkspaceSourceQuery,
  type CheckWorkspaceSourceQueryReturnType,
} from '../impl/check-workspace-source.query.js';

@QueryHandler(CheckWorkspaceSourceQuery)
export class CheckWorkspaceSourceHandler implements IQueryHandler<
  CheckWorkspaceSourceQuery,
  CheckWorkspaceSourceQueryReturnType
> {
  constructor(private readonly source: LocalWorkspaceSourceService) {}

  execute({ data }: CheckWorkspaceSourceQuery): Promise<CheckWorkspaceSourceQueryReturnType> {
    return this.source.check(workspacePath(data.sourcePath), workspaceType(data.type));
  }
}
