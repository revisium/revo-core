import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import {
  CreateProjectRecordCommand,
  type CreateProjectRecordCommandReturnType,
} from '../impl/create-project-record.command.js';

@CommandHandler(CreateProjectRecordCommand)
export class CreateProjectRecordHandler implements ICommandHandler<
  CreateProjectRecordCommand,
  CreateProjectRecordCommandReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: CreateProjectRecordCommand): Promise<CreateProjectRecordCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const created = await this.engine.createRow({
      revisionId,
      tableId: data.tableId,
      rowId: data.rowId,
      data: data.data,
    });

    return {
      id: created.row.id,
      data: created.row.data,
    };
  }
}
