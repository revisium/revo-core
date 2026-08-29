import { readFile } from 'node:fs/promises';

import { Inject, InternalServerErrorException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService, HashService, SystemTablesService } from '@revisium/engine';

import {
  SYSTEM_TABLE_IDS,
  type SystemTableValue,
} from '../../../../infrastructure/system-tables.constants.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import {
  ApplyContentModelCommand,
  type ApplyContentModelCommandReturnType,
} from '../impl/apply-content-model.command.js';

const DEFAULT_BRANCH_NAME = 'master';
const MIGRATIONS_URL = new URL(
  '../../../../../resources/content-model/migrations.json',
  import.meta.url,
);

type SystemTablesApi = {
  ensureSystemTable(
    revisionId: string,
    tableId: SystemTableValue,
  ): ReturnType<SystemTablesService['ensureSystemTable']>;
};

type EngineMigrations = Parameters<EngineApiService['applyMigrations']>[0]['migrations'];
type ContentModelMigration = EngineMigrations[number] & {
  readonly schema: object;
};

@CommandHandler(ApplyContentModelCommand)
export class ApplyContentModelHandler implements ICommandHandler<
  ApplyContentModelCommand,
  ApplyContentModelCommandReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    @Inject(SystemTablesService)
    private readonly systemTables: SystemTablesApi,
    @Inject(EngineApiService)
    private readonly engine: EngineApiService,
    private readonly hashes: HashService,
  ) {}

  async execute({ data }: ApplyContentModelCommand): Promise<ApplyContentModelCommandReturnType> {
    const draftRevisionId = await this.drafts.getDraftRevisionId(data.projectId);
    await this.ensureSystemTables(draftRevisionId);
    const migrationsApplied = await this.applyMigrations(draftRevisionId);
    if (!migrationsApplied) {
      return false;
    }

    await this.engine.createRevision({
      projectId: data.projectId,
      branchName: DEFAULT_BRANCH_NAME,
    });
    return true;
  }

  private async ensureSystemTables(draftRevisionId: string): Promise<void> {
    for (const tableId of SYSTEM_TABLE_IDS) {
      // oxlint-disable-next-line no-await-in-loop -- Stop before later writes after an ensure failure.
      await this.systemTables.ensureSystemTable(draftRevisionId, tableId);
    }
  }

  private async applyMigrations(draftRevisionId: string): Promise<boolean> {
    const migrations = await this.loadMigrations();
    const results = await this.engine.applyMigrations({ revisionId: draftRevisionId, migrations });
    const failed = results.find(({ status }) => status === 'failed');
    if (failed !== undefined) {
      const details = failed.error === undefined ? '' : `: ${failed.error}`;
      throw new InternalServerErrorException(
        `Content model migration "${failed.id}" failed${details}`,
      );
    }

    return results.some(({ status }) => status === 'applied');
  }

  private async loadMigrations(): Promise<EngineMigrations> {
    const content = await readFile(MIGRATIONS_URL, 'utf8');
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- The engine validates migration JSON at runtime.
    const migrations: ContentModelMigration[] = JSON.parse(content);
    return Promise.all(
      migrations.map(async (migration) => ({
        ...migration,
        hash: await this.hashes.hashObject(migration.schema),
      })),
    );
  }
}
