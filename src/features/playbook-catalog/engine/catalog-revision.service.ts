import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EngineApiService } from '@revisium/engine';

import { CatalogScope } from '../contracts/catalog.enums.js';
import { CatalogError } from '../contracts/catalog.errors.js';
import type { CatalogReadSelector } from '../contracts/catalog.types.js';
import { CATALOG_BRANCH_NAME, CATALOG_PROJECT_ID } from './catalog-engine.constants.js';

@Injectable()
export class CatalogRevisionService {
  constructor(private readonly engine: EngineApiService) {}

  async getDraftRevisionId(): Promise<string> {
    const branch = await this.engine.getBranch({
      projectId: CATALOG_PROJECT_ID,
      branchName: CATALOG_BRANCH_NAME,
    });
    const draft = await this.engine.getDraftRevision(branch.id);

    return draft.id;
  }

  async resolveRevision(
    selector: CatalogReadSelector,
  ): Promise<{ revisionId: string; isHead: boolean }> {
    const branch = await this.engine.getBranch({
      projectId: CATALOG_PROJECT_ID,
      branchName: CATALOG_BRANCH_NAME,
    });
    const head = await this.engine.getHeadRevision(branch.id);
    const scope = selector.scope ?? CatalogScope.HEAD;

    if (scope === CatalogScope.HEAD) {
      if (selector.revisionId !== undefined) {
        throw new BadRequestException(CatalogError.recordUnavailable);
      }

      return { revisionId: head.id, isHead: true };
    }

    if (scope === CatalogScope.DRAFT) {
      if (selector.revisionId !== undefined) {
        throw new BadRequestException(CatalogError.recordUnavailable);
      }

      return { revisionId: (await this.engine.getDraftRevision(branch.id)).id, isHead: false };
    }

    if (selector.revisionId === undefined || selector.revisionId === '') {
      throw new BadRequestException(CatalogError.recordUnavailable);
    }

    try {
      const selectedBranch = await this.engine.resolveBranchByRevision(selector.revisionId);

      if (selectedBranch.projectId !== CATALOG_PROJECT_ID) {
        throw new NotFoundException(CatalogError.recordUnavailable);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return { revisionId: selector.revisionId, isHead: selector.revisionId === head.id };
  }
}
