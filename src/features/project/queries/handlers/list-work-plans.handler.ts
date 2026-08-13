import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import {
  ListWorkPlansQuery,
  type ListWorkPlansQueryReturnType,
} from '../impl/list-work-plans.query.js';

@QueryHandler(ListWorkPlansQuery)
export class ListWorkPlansHandler implements IQueryHandler<
  ListWorkPlansQuery,
  ListWorkPlansQueryReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListWorkPlansQuery): Promise<ListWorkPlansQueryReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const rows =
      data.after === undefined
        ? await this.engine.getRows({ revisionId, tableId: 'WorkPlan', first: data.first })
        : await this.engine.getRows({
            revisionId,
            tableId: 'WorkPlan',
            first: data.first,
            after: data.after,
          });

    return {
      ...rows,
      edges: rows.edges.map((edge) => ({
        cursor: edge.cursor,
        node: this.drafts.toRecord(edge.node),
      })),
    };
  }
}
