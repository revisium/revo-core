import { CommandHandler, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { adrFromRow, adrRowData, ADR_TABLE_ID } from '../../adr.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import { requireRecordId, requireUserProject } from '../../project-request.js';
import { CreateAdrCommand, type CreateAdrCommandReturnType } from '../impl/create-adr.command.js';

@CommandHandler(CreateAdrCommand)
export class CreateAdrHandler implements ICommandHandler<
  CreateAdrCommand,
  CreateAdrCommandReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateAdrCommand): Promise<CreateAdrCommandReturnType> {
    requireRecordId(data.id);
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const created = await this.engine.createRow({
      revisionId,
      tableId: ADR_TABLE_ID,
      rowId: data.id,
      data: adrRowData(data),
    });

    return adrFromRow(created.row);
  }
}
