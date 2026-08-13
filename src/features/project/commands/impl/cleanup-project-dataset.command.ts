export type CleanupProjectDatasetCommandData = {
  readonly projectId: string;
};

export type CleanupProjectDatasetCommandReturnType = boolean;

export class CleanupProjectDatasetCommand {
  constructor(readonly data: CleanupProjectDatasetCommandData) {}
}
