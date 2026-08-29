import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';

import { PlaybookCatalogApiService } from '../../../playbook-catalog/playbook-catalog-api.service.js';
import { RevoRunService } from '../../revo-run.service.js';
import { rethrowPublicRunError } from '../../run-manager-error.mapper.js';
import { StartRunCommand, type StartRunCommandReturnType } from '../impl/start-run.command.js';

type SelectorName = 'pipeline' | 'profile';

type SelectedId = Readonly<{
  kind: 'id';
  value: string;
}>;

type SelectedDocument = Readonly<{
  kind: 'document';
}>;

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
    const pipeline = await this.resolvePipeline(command);
    const profile = await this.resolveProfile(command);

    try {
      return await this.runs.startRun({
        runId: `r${nanoid()}`,
        pipeline,
        profile,
        input: command.data.input,
      });
    } catch (error) {
      return rethrowPublicRunError(error);
    }
  }

  private async resolvePipeline(command: StartRunCommand): Promise<unknown> {
    const selector = this.selector(command, 'pipeline');

    if (selector.kind === 'id') {
      const record = await this.catalog.getPipeline(selector.value);

      return this.parseStoredDocument(record.pipeline, 'pipeline');
    }

    const pipeline = command.data.pipeline;
    if (pipeline === undefined) {
      return this.invalidSelector('pipeline', 'required');
    }

    return pipeline;
  }

  private async resolveProfile(command: StartRunCommand): Promise<unknown> {
    const selector = this.selector(command, 'profile');

    if (selector.kind === 'id') {
      const record = await this.catalog.getLaunchProfile(selector.value);

      return this.parseStoredDocument(record.profile, 'profile');
    }

    const profile = command.data.profile;
    if (profile === undefined) {
      return this.invalidSelector('profile', 'required');
    }

    return profile;
  }

  private selector(command: StartRunCommand, name: SelectorName): SelectedId | SelectedDocument {
    const idKey = `${name}Id` as const;
    const hasId = Object.hasOwn(command.data, idKey);
    const hasDocument = Object.hasOwn(command.data, name);

    if (hasId && hasDocument) {
      return this.invalidSelector(name, 'conflict');
    }
    if (!hasId && !hasDocument) {
      return this.invalidSelector(name, 'required');
    }
    if (!hasId) {
      return { kind: 'document' };
    }

    const value = command.data[idKey];
    if (typeof value !== 'string' || !/^[\w-]{1,64}$/.test(value)) {
      return this.invalidSelector(name, 'invalid_id');
    }

    return { kind: 'id', value };
  }

  private parseStoredDocument(value: unknown, name: SelectorName): unknown {
    if (typeof value !== 'string') {
      return this.catalogDefinitionCorrupt(name);
    }

    try {
      const parsed: unknown = JSON.parse(value);

      return parsed;
    } catch {
      return this.catalogDefinitionCorrupt(name);
    }
  }

  private catalogDefinitionCorrupt(name: SelectorName): never {
    throw new ConflictException({
      statusCode: 409,
      code: 'catalog_definition_corrupt',
      message: 'Catalog definition is corrupt.',
      path: `/${name}Id`,
      details: { reason: 'storage_json' },
    });
  }

  private invalidSelector(name: SelectorName, reason: string): never {
    throw new BadRequestException({
      statusCode: 400,
      code: 'run_selector_invalid',
      message: `Exactly one ${name} selector is required.`,
      path: `/${name}`,
      details: { reason },
    });
  }
}
