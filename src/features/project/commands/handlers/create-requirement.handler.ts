import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectTable } from '../../contracts/project-table.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import {
  CreateRequirementCommand,
  type CreateRequirementCommandReturnType,
} from '../impl/create-requirement.command.js';

@CommandHandler(CreateRequirementCommand)
export class CreateRequirementHandler implements ICommandHandler<
  CreateRequirementCommand,
  CreateRequirementCommandReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateRequirementCommand): Promise<CreateRequirementCommandReturnType> {
    const { projectId, id, ...row } = data;
    const revisionId = await this.drafts.getDraftRevisionId(projectId);
    const created = await this.engine.createRow({
      revisionId,
      tableId: ProjectTable.requirement,
      rowId: id,
      data: row,
    });

    return this.drafts.toRecord(created.row);
  }
}
