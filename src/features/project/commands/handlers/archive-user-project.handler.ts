import { Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { RunSnapshot } from '@revisium/revo-run';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { ProjectKind, ProjectStatus } from '../../../../__generated__/client/enums.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { reportErrorDiagnostic } from '../../../../infrastructure/error-diagnostic.js';
import { RevoRunService } from '../../../../infrastructure/run-runtime/revo-run.service.js';
import { ProjectApplicationError, ProjectErrorCode } from '../../contracts/project.errors.js';
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
      throw new ProjectApplicationError({ code: ProjectErrorCode.notFound, details: {} });
    }

    if (project.status !== ProjectStatus.ACTIVE) {
      throw new ProjectApplicationError({ code: ProjectErrorCode.notActive, details: {} });
    }

    const projectRuns = await this.transaction.projectRun.findMany({
      where: { projectId },
      select: { runId: true },
    });

    const blockingRunIds = await this.findBlockingRunIds(
      projectId,
      projectRuns.map(({ runId }) => runId),
    );

    if (blockingRunIds.length > 0) {
      throw new ProjectApplicationError({
        code: ProjectErrorCode.hasActiveRuns,
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

  private async findBlockingRunIds(
    projectId: string,
    runIds: readonly string[],
  ): Promise<string[]> {
    const observations = await Promise.all(
      runIds.map(async (runId) => ({
        runId,
        snapshot: await this.readRunForArchival(projectId, runId),
      })),
    );

    return observations
      .filter(({ snapshot }) => blocksProjectArchival(snapshot))
      .map(({ runId }) => runId);
  }

  private async readRunForArchival(
    projectId: string,
    runId: string,
  ): Promise<RunSnapshot | undefined> {
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
  }
}

function blocksProjectArchival(snapshot: RunSnapshot | undefined): boolean {
  return snapshot === undefined || !['succeeded', 'failed', 'cancelled'].includes(snapshot.status);
}
