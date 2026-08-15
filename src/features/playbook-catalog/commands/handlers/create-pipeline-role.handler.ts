import { BadRequestException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
import { asCatalogData } from '../../domain/catalog-record.js';
import {
  CreatePipelineRoleCommand,
  type CreatePipelineRoleCommandReturnType,
} from '../impl/create-pipeline-role.command.js';

@CommandHandler(CreatePipelineRoleCommand)
export class CreatePipelineRoleHandler implements ICommandHandler<
  CreatePipelineRoleCommand,
  CreatePipelineRoleCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreatePipelineRoleCommand): Promise<CreatePipelineRoleCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    await this.assertSamePlaybook(revisionId, data.pipelineId, data.roleId);
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.pipelineRoles,
      rowId: data.id,
      data: {
        pipelineId: data.pipelineId,
        roleId: data.roleId,
        membership: data.membership,
      },
    });

    return this.drafts.toRecord(created.row, revisionId, false, CatalogTable.pipelineRoles);
  }

  private async assertSamePlaybook(
    revisionId: string,
    pipelineId: string,
    roleId: string,
  ): Promise<void> {
    const pipeline = await this.engine.getRow({
      revisionId,
      tableId: CatalogTable.pipelines,
      rowId: pipelineId,
    });
    const role = await this.engine.getRow({
      revisionId,
      tableId: CatalogTable.roles,
      rowId: roleId,
    });
    const pipelineData = pipeline === null ? undefined : asCatalogData(pipeline.data);
    const roleData = role === null ? undefined : asCatalogData(role.data);

    if (
      pipelineData === undefined ||
      roleData === undefined ||
      pipelineData.playbookId !== roleData.playbookId
    ) {
      throw new BadRequestException(CatalogError.invalidRelation);
    }
  }
}
