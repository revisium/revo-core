import { Logger } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { IPaginatedType } from '@revisium/engine';
import type { RunSnapshot } from '@revisium/revo-run';
import type { RunStatus } from '@revisium/revo-run';

import { reportErrorDiagnostic } from '../../../../infrastructure/error-diagnostic.js';
import { getOffsetPagination } from '../../../../infrastructure/pagination/get-offset-pagination.js';
import { RevoRunService } from '../../../../infrastructure/run-runtime/revo-run.service.js';
import { ProjectApiService } from '../../../project/project-api.service.js';
import { validateRunListInput } from '../../contracts/run-list.validation.js';
import { isReportableRunError, rethrowPublicRunError } from '../../run-manager-error.mapper.js';
import { ListRunsQuery, type ListRunsQueryReturnType } from '../impl/list-runs.query.js';

@QueryHandler(ListRunsQuery)
export class ListRunsHandler implements IQueryHandler<ListRunsQuery, ListRunsQueryReturnType> {
  private readonly logger = new Logger(ListRunsHandler.name);

  constructor(
    private readonly projects: ProjectApiService,
    private readonly runs: RevoRunService,
  ) {}

  async execute({ data }: ListRunsQuery): Promise<ListRunsQueryReturnType> {
    const statuses = validateRunListInput(data.projectId, data.statuses);
    const runIds = await this.projects.getProjectRunIds(data.projectId);
    let page: IPaginatedType<RunSnapshot>;

    try {
      page = await this.readPage(runIds, statuses, data);
    } catch (error) {
      if (isReportableRunError(error)) {
        reportErrorDiagnostic(
          this.logger,
          { operation: 'run.list', projectId: data.projectId },
          error,
        );
      }

      return rethrowPublicRunError(error);
    }

    return {
      ...page,
      edges: page.edges.map((edge) => ({
        ...edge,
        node: { ...edge.node, projectId: data.projectId },
      })),
    };
  }

  private async readPage(
    runIds: readonly string[],
    statuses: readonly RunStatus[] | undefined,
    pageData: ListRunsQuery['data'],
  ): Promise<IPaginatedType<RunSnapshot>> {
    const snapshots: RunSnapshot[] = [];

    await runIds.reduce(async (previous, runId) => {
      await previous;
      const snapshot = await this.runs.getRun(runId);

      if (
        snapshot !== undefined &&
        (statuses === undefined || statuses.includes(snapshot.status))
      ) {
        snapshots.push(snapshot);
      }
    }, Promise.resolve());

    snapshots.sort(compareRunSnapshots);

    return getOffsetPagination({
      pageData,
      findMany: async ({ skip, take }) => snapshots.slice(skip, skip + take),
      count: async () => snapshots.length,
    });
  }
}

function compareRunSnapshots(left: RunSnapshot, right: RunSnapshot): number {
  if (left.createdAt !== right.createdAt) {
    return left.createdAt > right.createdAt ? -1 : 1;
  }

  if (left.runId < right.runId) {
    return -1;
  }

  if (left.runId > right.runId) {
    return 1;
  }

  return 0;
}
