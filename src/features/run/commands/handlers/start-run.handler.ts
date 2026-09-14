import { BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { RunManagerError, type PipelineSourcePackage, type RunProfile } from '@revisium/revo-run';
import { nanoid } from 'nanoid';

import { reportErrorDiagnostic } from '../../../../infrastructure/error-diagnostic.js';
import { RevoRunService } from '../../../../infrastructure/run-runtime/revo-run.service.js';
import { isCatalogRecordId } from '../../../playbook-catalog/contracts/catalog-record-id.js';
import { PlaybookCatalogApiService } from '../../../playbook-catalog/playbook-catalog-api.service.js';
import { ProjectApiService } from '../../../project/project-api.service.js';
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

    const pipeline = await this.selectedPipeline(data, hasPipelineId);
    const profile = await this.selectedProfile(data, hasProfileId);

    this.assertProfileShape(profile);

    if (typeof data.projectId !== 'string' || data.projectId.trim().length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'project_id_invalid',
        message: 'Project ID is required.',
        path: '/projectId',
        details: { reason: 'required' },
      });
    }

    const runId = `r${nanoid()}`;

    try {
      await this.projects.reserveRun({ projectId: data.projectId, runId });
    } catch (error) {
      throw projectReservationError(error);
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

  private async selectedPipeline(
    data: StartRunCommandData,
    hasPipelineId: boolean,
  ): Promise<PipelineSourcePackage> {
    if (hasPipelineId) {
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

  private async selectedProfile(
    data: StartRunCommandData,
    hasProfileId: boolean,
  ): Promise<RunProfile> {
    if (hasProfileId) {
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
    throw new BadRequestException({
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one pipeline selector is required.',
      path: '/pipeline',
      details: { reason },
    });
  }

  private invalidProfileSelector(reason: string): never {
    throw new BadRequestException({
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one profile selector is required.',
      path: '/profile',
      details: { reason },
    });
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

function projectReservationError(error: unknown): never {
  if (error instanceof NotFoundException) {
    throw new NotFoundException({
      statusCode: 404,
      code: 'project_unavailable',
      message: error.message,
      path: '/projectId',
      details: {},
    });
  }

  if (error instanceof ConflictException) {
    throw new ConflictException({
      statusCode: 409,
      code: 'project_archived',
      message: error.message,
      path: '/projectId',
      details: {},
    });
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
