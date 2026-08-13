import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { ProjectError } from '../../project-errors.js';
import {
  CONTENT_TABLE_IDS,
  linkFieldsTargeting,
  linkValues,
  type ContentTableId,
} from '../../project-records.js';
import {
  DeleteProjectRecordCommand,
  type DeleteProjectRecordCommandReturnType,
} from '../impl/delete-project-record.command.js';

const REFERENCE_SCAN_PAGE_SIZE = 100;

@CommandHandler(DeleteProjectRecordCommand)
export class DeleteProjectRecordHandler implements ICommandHandler<
  DeleteProjectRecordCommand,
  DeleteProjectRecordCommandReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: DeleteProjectRecordCommand): Promise<DeleteProjectRecordCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const existing = await this.engine.getRow({
      revisionId,
      tableId: data.tableId,
      rowId: data.rowId,
    });
    if (existing === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    const referenced = await this.hasIncomingReferences(revisionId, data.tableId, data.rowId);
    if (referenced) {
      throw new BadRequestException(ProjectError.recordStillReferenced);
    }

    await this.engine.removeRow({
      revisionId,
      tableId: data.tableId,
      rowId: data.rowId,
    });
    return true;
  }

  private async hasIncomingReferences(
    revisionId: string,
    tableId: ContentTableId,
    rowId: string,
  ): Promise<boolean> {
    for (const scanTableId of CONTENT_TABLE_IDS) {
      // oxlint-disable-next-line no-await-in-loop -- Scan each content table until a reference is found.
      const referenced = await this.tableReferencesRow(revisionId, scanTableId, tableId, rowId);
      if (referenced) {
        return true;
      }
    }

    return false;
  }

  private async tableReferencesRow(
    revisionId: string,
    scanTableId: ContentTableId,
    targetTableId: ContentTableId,
    rowId: string,
  ): Promise<boolean> {
    const fields = linkFieldsTargeting(scanTableId, targetTableId);
    if (fields.length === 0) {
      return false;
    }

    let after: string | undefined;
    for (;;) {
      // oxlint-disable-next-line no-await-in-loop -- Page through draft rows until a reference is found.
      const page = await this.engine.getRows(
        after === undefined
          ? { revisionId, tableId: scanTableId, first: REFERENCE_SCAN_PAGE_SIZE }
          : { revisionId, tableId: scanTableId, first: REFERENCE_SCAN_PAGE_SIZE, after },
      );
      const referenced = page.edges.some((edge) => {
        if (scanTableId === targetTableId && edge.node.id === rowId) {
          return false;
        }
        return fields.some((field) => linkValues(edge.node.data, field).includes(rowId));
      });
      if (referenced) {
        return true;
      }
      if (!page.pageInfo.hasNextPage || page.pageInfo.endCursor === undefined) {
        return false;
      }
      after = page.pageInfo.endCursor;
    }
  }
}
