import { Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { RunManagerError, type PipelineSourcePackage, type RunProfile } from '@revisium/revo-run';
import { nanoid } from 'nanoid';

import { reportErrorDiagnostic } from '../../../../infrastructure/error-diagnostic.js';
import { RevoRunService } from '../../../../infrastructure/run-runtime/revo-run.service.js';
import { isCatalogRecordId } from '../../../playbook-catalog/contracts/catalog-record-id.js';
import { PlaybookCatalogApiService } from '../../../playbook-catalog/playbook-catalog-api.service.js';
import {
  ProjectApplicationError,
  ProjectErrorCode,
} from '../../../project/contracts/project.errors.js';
import { ProjectApiService } from '../../../project/project-api.service.js';
import { RunApplicationError } from '../../contracts/run.errors.js';
import { isReportableRunError, rethrowPublicRunError } from '../../run-manager-error.mapper.js';
import {
  StartRunCommand,
  type StartRunCommandData,
  type StartRunCommandReturnType,
} from '../impl/start-run.command.js';

@CommandHandler(StartRunCommand)
export class StartRunHandler implements ICommandHandler<
  StartRunCommand,
  StartRunCommandReturnType
> {
  private readonly logger = new Logger(StartRunHandler.name);

  constructor(
    private readonly catalog: PlaybookCatalogApiService,
    private readonly projects: ProjectApiService,
    private readonly runs: RevoRunService,
  ) {}

  async execute(command: StartRunCommand): Promise<StartRunCommandReturnType> {
    const { data } = command;

    this.assertSelectors(data);

    const pipeline = await this.resolvePipeline(data);
    const profile = await this.resolveProfile(data);

    this.assertProfileShape(profile);
    this.assertProjectId(data.projectId);

    const runId = `r${nanoid()}`;

    try {
      await this.projects.reserveRun({ projectId: data.projectId, runId });
    } catch (error) {
      return rethrowProjectReservationError(error);
    }

    try {
      return await this.runs.createRun({
        runId,
        pipeline,
        profile,
        input: data.input,
      });
    } catch (error) {
      if (isDefinitiveAdmissionRejection(error)) {
        await this.releaseRejectedReservation(data.projectId, runId, error);
      }

      if (isReportableRunError(error)) {
        reportErrorDiagnostic(this.logger, { operation: 'run.create', runId }, error);
      }

      return rethrowPublicRunError(error);
    }
  }

  private async releaseRejectedReservation(
    projectId: string,
    runId: string,
    originalError: unknown,
  ): Promise<void> {
    try {
      await this.projects.releaseRun({ projectId, runId });
    } catch (error) {
      reportErrorDiagnostic(
        this.logger,
        { operation: 'run.create.reservation_cleanup', runId },
        new AggregateError([originalError, error], 'Rejected run reservation cleanup failed.'),
      );
    }
  }

  private async resolvePipeline(data: StartRunCommandData): Promise<PipelineSourcePackage> {
    if (Object.hasOwn(data, 'pipelineId')) {
      if (!isCatalogRecordId(data.pipelineId)) {
        return this.invalidPipelineSelector('invalid_id');
      }

      return (await this.catalog.getPipeline(data.pipelineId)).pipeline;
    }

    if (data.pipeline === undefined) {
      return this.invalidPipelineSelector('required');
    }

    return data.pipeline;
  }

  private async resolveProfile(data: StartRunCommandData): Promise<RunProfile> {
    if (Object.hasOwn(data, 'profileId')) {
      if (!isCatalogRecordId(data.profileId)) {
        return this.invalidProfileSelector('invalid_id');
      }

      return (await this.catalog.getLaunchProfile(data.profileId)).profile;
    }

    if (data.profile === undefined) {
      return this.invalidProfileSelector('required');
    }

    return data.profile;
  }

  private invalidPipelineSelector(reason: string): never {
    throw new RunApplicationError('run_selector_invalid', { selector: 'pipeline', reason });
  }

  private invalidProfileSelector(reason: string): never {
    throw new RunApplicationError('run_selector_invalid', { selector: 'profile', reason });
  }

  private assertSelectors(data: StartRunCommandData): void {
    const hasPipelineId = Object.hasOwn(data, 'pipelineId');
    const hasPipeline = Object.hasOwn(data, 'pipeline');
    const hasProfileId = Object.hasOwn(data, 'profileId');
    const hasProfile = Object.hasOwn(data, 'profile');

    if (hasPipelineId && hasPipeline) {
      return this.invalidPipelineSelector('conflict');
    }

    if (!hasPipelineId && !hasPipeline) {
      return this.invalidPipelineSelector('required');
    }

    if (hasProfileId && hasProfile) {
      return this.invalidProfileSelector('conflict');
    }

    if (!hasProfileId && !hasProfile) {
      return this.invalidProfileSelector('required');
    }
  }

  private assertProjectId(projectId: string): void {
    if (typeof projectId !== 'string' || projectId.trim().length === 0) {
      throw new RunApplicationError('project_id_invalid', {});
    }
  }

  private assertProfileShape(profile: RunProfile): void {
    if (
      typeof profile !== 'object' ||
      profile === null ||
      typeof profile.bindings !== 'object' ||
      profile.bindings === null ||
      typeof profile.bindings.agents !== 'object' ||
      profile.bindings.agents === null
    ) {
      return rethrowPublicRunError(
        new RunManagerError('invalid_create_run_input', {
          path: '',
          reason: 'invalid_envelope',
        }),
      );
    }
  }
}

function rethrowProjectReservationError(error: unknown): never {
  if (error instanceof ProjectApplicationError && error.code === ProjectErrorCode.notFound) {
    throw new RunApplicationError('project_unavailable', {});
  }

  if (error instanceof ProjectApplicationError && error.code === ProjectErrorCode.notActive) {
    throw new RunApplicationError('project_archived', {});
  }

  throw error;
}

function isDefinitiveAdmissionRejection(error: unknown): error is RunManagerError {
  return (
    error instanceof RunManagerError &&
    [
      'invalid_create_run_input',
      'invalid_run_id',
      'pipeline_compilation_failed',
      'run_profile_invalid',
      'run_requirement_unresolved',
    ].includes(error.code)
  );
}
