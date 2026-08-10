import { readFile } from 'node:fs/promises';

import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { EngineApiService, SystemTablesService } from '@revisium/engine';

import { ProjectApiService } from '../project/project-api.service.js';
import {
  SYSTEM_PLAYBOOKS_PROJECT,
  SYSTEM_TABLE_IDS,
  type SystemTableValue,
} from './revisium-bootstrap.constants.js';

const MIGRATIONS_URL = new URL(
  '../../../resources/system-playbooks/migrations.json',
  import.meta.url,
);
type SystemTablesApi = {
  ensureSystemTable(
    revisionId: string,
    tableId: SystemTableValue,
  ): ReturnType<SystemTablesService['ensureSystemTable']>;
};
type EngineMigrations = Parameters<EngineApiService['applyMigrations']>[0]['migrations'];

@Injectable()
export class RevisiumBootstrapService implements OnApplicationBootstrap {
  constructor(
    @Inject(ProjectApiService)
    private readonly projects: ProjectApiService,
    @Inject(SystemTablesService)
    private readonly systemTables: SystemTablesApi,
    @Inject(EngineApiService)
    private readonly engine: EngineApiService,
  ) {}

  onApplicationBootstrap(): Promise<void> {
    return this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    const projectId = await this.projects.ensureProject(SYSTEM_PLAYBOOKS_PROJECT);
    const branch = await this.engine.getBranch({
      projectId,
      branchName: 'master',
    });
    const draft = await this.engine.getDraftRevision(branch.id);

    await this.ensureSystemTables(draft.id);
    const migrationsApplied = await this.applyMigrations(draft.id);
    if (!migrationsApplied) {
      return;
    }

    await this.engine.createRevision({ projectId, branchName: 'master' });
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
      throw new Error(`Revisium migration "${failed.id}" failed${details}`);
    }

    return results.some(({ status }) => status === 'applied');
  }

  private async loadMigrations(): Promise<EngineMigrations> {
    const content = await readFile(MIGRATIONS_URL, 'utf8');
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- The engine validates migration JSON at runtime.
    const migrations: EngineMigrations = JSON.parse(content);
    return migrations;
  }
}
