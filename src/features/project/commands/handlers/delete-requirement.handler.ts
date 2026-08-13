import { NotFoundException } from '@nestjs/common';
import { CommandHandler, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { ProjectError } from '../../project-errors.js';
import { requireUserProject } from '../../project-request.js';
import { REQUIREMENT_TABLE_ID } from '../../requirement.js';
import {
  DeleteRequirementCommand,
  type DeleteRequirementCommandReturnType,
} from '../impl/delete-requirement.command.js';

@CommandHandler(DeleteRequirementCommand)
export class DeleteRequirementHandler implements ICommandHandler<
  DeleteRequirementCommand,
  DeleteRequirementCommandReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteRequirementCommand): Promise<DeleteRequirementCommandReturnType> {
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const existing = await this.engine.getRow({
      revisionId,
      tableId: REQUIREMENT_TABLE_ID,
      rowId: data.id,
    });
    if (existing === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    await this.engine.removeRow({
      revisionId,
      tableId: REQUIREMENT_TABLE_ID,
      rowId: data.id,
    });
    return true;
  }
}
