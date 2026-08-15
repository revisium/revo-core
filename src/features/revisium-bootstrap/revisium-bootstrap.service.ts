import { readFile } from 'node:fs/promises';

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { EngineApiService, SystemTablesService } from '@revisium/engine';

import { CatalogTable } from '../playbook-catalog/constants/catalog.constants.js';
import { PlaybookCatalogApiService } from '../playbook-catalog/playbook-catalog-api.service.js';
import { ProjectApiService } from '../project/project-api.service.js';
import {
  SYSTEM_PLAYBOOKS_PROJECT,
  SYSTEM_TABLE_IDS,
  type SystemTableValue,
} from './revisium-bootstrap.constants.js';

const SEED_URL = new URL('../../../resources/playbook-catalog/seed.json', import.meta.url);

type SystemTablesApi = {
  ensureSystemTable(
    revisionId: string,
    tableId: SystemTableValue,
  ): ReturnType<SystemTablesService['ensureSystemTable']>;
};

@Injectable()
export class RevisiumBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RevisiumBootstrapService.name);

  constructor(
    @Inject(ProjectApiService)
    private readonly projects: ProjectApiService,
    @Inject(SystemTablesService)
    private readonly systemTables: SystemTablesApi,
    @Inject(EngineApiService)
    private readonly engine: EngineApiService,
    @Inject(PlaybookCatalogApiService)
    private readonly catalog: PlaybookCatalogApiService,
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
    await this.catalog.bootstrapCatalog();

    if (await this.engine.getTouchedByBranchId(branch.id)) {
      this.logger.warn('Catalog seed skipped because the Draft has uncommitted changes');

      return;
    }

    const head = await this.engine.getHeadRevision(branch.id);

    if ((await this.headHasNoPlaybooks(head.id)) && (await this.importSeed())) {
      await this.catalog.commitCatalog('Bootstrap Playbook Catalog');
    }
  }

  private async ensureSystemTables(draftRevisionId: string): Promise<void> {
    for (const tableId of SYSTEM_TABLE_IDS) {
      // oxlint-disable-next-line no-await-in-loop -- Stop before later writes after an ensure failure.
      await this.systemTables.ensureSystemTable(draftRevisionId, tableId);
    }
  }

  private async headHasNoPlaybooks(headRevisionId: string): Promise<boolean> {
    try {
      const playbooks = await this.engine.getRows({
        revisionId: headRevisionId,
        tableId: CatalogTable.playbooks,
        first: 1,
      });

      return playbooks.totalCount === 0;
    } catch (error) {
      if (
        error instanceof BadRequestException &&
        error.message.includes('does not exist in the revision')
      ) {
        return true;
      }

      throw error;
    }
  }

  private async importSeed(): Promise<boolean> {
    const content = await readFile(SEED_URL, 'utf8');
    const payload: unknown = JSON.parse(content);
    const result = await this.catalog.importCatalog(payload);

    return result.tables.some(({ created, updated }) => created > 0 || updated > 0);
  }
}
