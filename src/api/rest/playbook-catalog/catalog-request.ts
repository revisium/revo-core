import { BadRequestException } from '@nestjs/common';

import type {
  CatalogPageData,
  CatalogReadSelector,
} from '../../../features/playbook-catalog/catalog.types.js';
import { CatalogScope } from '../../../features/playbook-catalog/constants/catalog.constants.js';

export function catalogSelector(scope?: string, revisionId?: string): CatalogReadSelector {
  const selectedScope = parseScope(scope);
  return revisionId === undefined ? { scope: selectedScope } : { scope: selectedScope, revisionId };
}

function parseScope(scope?: string): CatalogScope {
  switch (scope) {
    case undefined:
    case CatalogScope.HEAD: {
      return CatalogScope.HEAD;
    }
    case CatalogScope.DRAFT: {
      return CatalogScope.DRAFT;
    }
    case CatalogScope.REVISION: {
      return CatalogScope.REVISION;
    }
    default: {
      throw new BadRequestException('Catalog scope is invalid');
    }
  }
}

export function catalogPage(
  first: string | undefined,
  after: string | undefined,
  scope: string | undefined,
  revisionId: string | undefined,
): CatalogPageData {
  const pageSize = first === undefined ? 100 : Number(first);

  return {
    first: pageSize,
    ...catalogSelector(scope, revisionId),
    ...(after === undefined ? {} : { after }),
  };
}
