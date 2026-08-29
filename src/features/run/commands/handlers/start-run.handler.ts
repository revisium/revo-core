import { BadRequestException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';

import { isCatalogRecordId } from '../../../playbook-catalog/contracts/catalog-record-id.js';
import { PlaybookCatalogApiService } from '../../../playbook-catalog/playbook-catalog-api.service.js';
import { RevoRunService } from '../../revo-run.service.js';
import { rethrowPublicRunError } from '../../run-manager-error.mapper.js';
import { StartRunCommand, type StartRunCommandReturnType } from '../impl/start-run.command.js';

@CommandHandler(StartRunCommand)
export class StartRunHandler implements ICommandHandler<
  StartRunCommand,
  StartRunCommandReturnType
> {
  constructor(
    private readonly catalog: PlaybookCatalogApiService,
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

    let pipeline: unknown;
    if (hasPipelineId) {
      if (!isCatalogRecordId(data.pipelineId)) {
        return this.invalidPipelineSelector('invalid_id');
      }
      pipeline = (await this.catalog.getPipeline(data.pipelineId)).pipeline;
    } else {
      if (data.pipeline === undefined) {
        return this.invalidPipelineSelector('required');
      }
      pipeline = data.pipeline;
    }

    let profile: unknown;
    if (hasProfileId) {
      if (!isCatalogRecordId(data.profileId)) {
        return this.invalidProfileSelector('invalid_id');
      }
      profile = (await this.catalog.getLaunchProfile(data.profileId)).profile;
    } else {
      if (data.profile === undefined) {
        return this.invalidProfileSelector('required');
      }
      profile = data.profile;
    }

    try {
      return await this.runs.startRun({
        runId: `r${nanoid()}`,
        pipeline,
        profile,
        input: data.input,
      });
    } catch (error) {
      return rethrowPublicRunError(error);
    }
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
}
