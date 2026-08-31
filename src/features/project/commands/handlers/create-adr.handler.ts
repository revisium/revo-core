import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectTable } from '../../contracts/project-table.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import { CreateAdrCommand, type CreateAdrCommandReturnType } from '../impl/create-adr.command.js';

@CommandHandler(CreateAdrCommand)
export class CreateAdrHandler implements ICommandHandler<
  CreateAdrCommand,
  CreateAdrCommandReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateAdrCommand): Promise<CreateAdrCommandReturnType> {
    const { projectId, id, ...row } = data;
    const revisionId = await this.drafts.getDraftRevisionId(projectId);
    const created = await this.engine.createRow({
      revisionId,
      tableId: ProjectTable.adr,
      rowId: id,
      data: row,
    });

    return this.drafts.toRecord(created.row);
  }
}
