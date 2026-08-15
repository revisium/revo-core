import type { CatalogCommitResult } from '../../catalog.types.js';

export type CommitCatalogCommandData = {
  readonly message: string;
};

export type CommitCatalogCommandReturnType = CatalogCommitResult;

export class CommitCatalogCommand {
  constructor(readonly data: CommitCatalogCommandData) {}
}
