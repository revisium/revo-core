import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { ProjectKind, ProjectStatus } from '../../../../__generated__/client/enums.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { reportErrorDiagnostic } from '../../../../infrastructure/error-diagnostic.js';
import { RevoRunService } from '../../../../infrastructure/run-runtime/revo-run.service.js';
import { ProjectError } from '../../contracts/project.errors.js';
import {
  ArchiveUserProjectCommand,
  type ArchiveUserProjectCommandReturnType,
} from '../impl/archive-user-project.command.js';

@CommandHandler(ArchiveUserProjectCommand)
export class ArchiveUserProjectHandler implements ICommandHandler<
  ArchiveUserProjectCommand,
  ArchiveUserProjectCommandReturnType
> {
  private readonly logger = new Logger(ArchiveUserProjectHandler.name);

  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly runs: RevoRunService,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: ArchiveUserProjectCommand): Promise<ArchiveUserProjectCommandReturnType> {
    return this.transactions.runSerializable(() => this.archiveProject(data.projectId));
  }

  private async archiveProject(projectId: string): Promise<ArchiveUserProjectCommandReturnType> {
    const project = await this.transaction.project.findFirst({
      where: { id: projectId, kind: ProjectKind.USER },
      select: { status: true },
    });

    if (project === null || project.status === ProjectStatus.CREATING) {
      throw new NotFoundException(ProjectError.notFound);
    }

    if (project.status !== ProjectStatus.ACTIVE) {
      throw new ConflictException(ProjectError.notActive);
    }

    const runIds = await this.transaction.projectRun.findMany({
      where: { projectId },
      select: { runId: true },
    });

    const blockingRunIds = await this.blockingRunIds(
      projectId,
      runIds.map(({ runId }) => runId),
    );

    if (blockingRunIds.length > 0) {
      throw new ConflictException({
        statusCode: 409,
        code: 'project_has_active_runs',
        message: ProjectError.hasActiveRuns,
        path: '/projectId',
        details: { runIds: blockingRunIds },
      });
    }

    await this.transaction.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ARCHIVED },
      select: { id: true },
    });

    return true;
  }

  private async blockingRunIds(projectId: string, runIds: readonly string[]): Promise<string[]> {
    const snapshots = await Promise.all(
      runIds.map(async (runId) => {
        try {
          return await this.runs.getRun(runId);
        } catch (error) {
          reportErrorDiagnostic(
            this.logger,
            { operation: 'project.archive.run_observation', projectId, runId },
            error,
          );
          throw error;
        }
      }),
    );

    return runIds.filter((runId, index) => {
      const snapshot = snapshots[index];

      return (
        snapshot === undefined || !['succeeded', 'failed', 'cancelled'].includes(snapshot.status)
      );
    });
  }
}
