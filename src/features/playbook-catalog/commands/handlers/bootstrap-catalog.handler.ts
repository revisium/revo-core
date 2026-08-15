import { readFile } from 'node:fs/promises';

import { BadRequestException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CATALOG_BRANCH_NAME, CATALOG_PROJECT_ID } from '../../constants/catalog.constants.js';
import {
  BootstrapCatalogCommand,
  type BootstrapCatalogCommandReturnType,
} from '../impl/bootstrap-catalog.command.js';

const MIGRATIONS_URL = new URL(
  '../../../../../resources/system-playbooks/migrations.json',
  import.meta.url,
);

type EngineMigrations = Parameters<EngineApiService['applyMigrations']>[0]['migrations'];

@CommandHandler(BootstrapCatalogCommand)
export class BootstrapCatalogHandler implements ICommandHandler<
  BootstrapCatalogCommand,
  BootstrapCatalogCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute(): Promise<BootstrapCatalogCommandReturnType> {
    const branch = await this.engine.getBranch({
      projectId: CATALOG_PROJECT_ID,
      branchName: CATALOG_BRANCH_NAME,
    });
    const dirty = await this.engine.getTouchedByBranchId(branch.id);
    const draft = await this.engine.getDraftRevision(branch.id);
    const migrations = await this.loadMigrations();
    const pending = await this.hasPendingMigration(draft.id, migrations);

    if (dirty && pending) {
      await this.commit('Bootstrap Playbook Catalog');
    }

    const revisionId = await this.drafts.getDraftRevisionId();
    const applied = await this.applyMigrations(revisionId, migrations);

    if (applied) {
      await this.commit('Bootstrap Playbook Catalog');
    }

    return applied;
  }

  private async hasPendingMigration(
    revisionId: string,
    migrations: EngineMigrations,
  ): Promise<boolean> {
    for (const migration of migrations) {
      if (migration.changeType !== 'init') {
        continue;
      }

      if (!(await this.tableExists(revisionId, migration.tableId))) {
        return true;
      }
    }

    return false;
  }

  private async tableExists(revisionId: string, tableId: string): Promise<boolean> {
    try {
      await this.engine.getRows({ revisionId, tableId, first: 1 });

      return true;
    } catch (error) {
      if (
        error instanceof BadRequestException &&
        error.message.includes('does not exist in the revision')
      ) {
        return false;
      }

      throw error;
    }
  }

  private async applyMigrations(
    revisionId: string,
    migrations: EngineMigrations,
  ): Promise<boolean> {
    const results = await this.engine.applyMigrations({ revisionId, migrations });
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

  private async commit(comment: string): Promise<void> {
    await this.engine.createRevision({
      projectId: CATALOG_PROJECT_ID,
      branchName: CATALOG_BRANCH_NAME,
      comment,
    });
  }
}
